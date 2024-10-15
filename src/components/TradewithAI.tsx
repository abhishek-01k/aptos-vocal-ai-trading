"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Mic, MicOff, PenSquare, Send, Play } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import brian from "@/lib/brian";
import { default as languageCodesData } from "@/data/language-codes.json";
import { default as countryCodesData } from "@/data/country-codes.json";
import { InputTransactionData, useWallet } from "@aptos-labs/wallet-adapter-react";
import { default as tokenlist } from "@/config/token-list.json";
import Panora from "@panoraexchange/swap-sdk"
import { aptosClient } from "@/config/aptosConnector.config";
import { protocolMappings } from "@/lib/protocol-mapping";
import { ThalaswapRouter } from "@thalalabs/router-sdk";
import { Network } from "@aptos-labs/ts-sdk";
import { handleGetThalaQuote } from "../../helpers/thalaSwap";
import { SDK, convertValueToDecimal } from '@pontem/liquidswap-sdk';
import { handleGetLiquidQuote } from "../../helpers/liquidSwap";
import { Account, Aptos, AptosConfig } from "@aptos-labs/ts-sdk";
import { EchelonClient } from 'echelon-sdk-aptosmanager';

import { AptosClient, AptosAccount, CoinClient, Types } from 'aptos';

const languageCodes: Record<string, string> = languageCodesData;
const countryCodes: Record<string, string> = countryCodesData;

const TradewithAI = () => {
  const [isListening, setIsListening] = useState(false);
  const [text, setText] = useState("");
  const [translation, setTranslation] = useState("");
  const [language, setLanguage] = useState("en-US");
  const [messages, setMessages] = useState<Array<{
    role: "user" | "assistant";
    content: string;
    originalContent?: string;
    canExecute?: boolean;
    result?: any
  }>>([]);
  const [isEditing, setIsEditing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [selectedProtocol, setSelectedProtocol] = useState("thalaswap");

  const client = new Panora({
    apiKey: process.env.NEXT_PUBLIC_APP_PANORA_API_KEY!,
  });

  const {
    account,
    network,
    signAndSubmitTransaction,
  } = useWallet();

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = false;
    recognitionRef.current.lang = language;

    recognitionRef.current.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      setText(transcript);
      if (language !== "en-US") {
        const translatedText = await translateText(transcript, "en-US");
        setTranslation(translatedText);
      }
    };

    recognitionRef.current.onend = () => setIsListening(false);

    return () => {
      recognitionRef.current?.abort();
    };
  }, [language]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const handleSend = async () => {
    if (text.trim()) {
      let messageToProcess = language === "en-US" ? text : translation;
      
      setMessages(prev => [...prev, {
        role: "user",
        content: messageToProcess,
        originalContent: language !== "en-US" ? text : undefined,
      }]);
      setText("");
      setTranslation("");
      setIsEditing(false);

      // Process the message with Brian
      const result = await brian.extract({
        prompt: messageToProcess,
      });

      // AI response
      setTimeout(() => {
        setMessages(prev => [...prev, {
          role: "assistant",
          content: `I've received your command: "${messageToProcess}". ${result ? "I can execute this transaction for you." : "I couldn't process this as a transaction."}`,
          canExecute: !!result,
          result: result
        }]);
      }, 1000);
    }
  };

  const executeTransaction = async (messageIndex: number) => {

    const extractedText = messages[messageIndex];
    console.log(extractedText,"a")
    // Implement your transaction execution logic here
    console.log("Executing transaction for message:", messages[messageIndex]);
    handleTransaction(extractedText.result)
  };

  // Implement this function to call your translation API
  const translateText = async (text: string, targetLang: string): Promise<string> => {
    // Replace this with your actual translation API call
    console.log(`Translating: ${text} to ${targetLang}`);
    return `Translated: ${text}`;
  };

  const findFunctionFromPrompt = (result: any) => {
    if (!result || !result.completion || result.completion.length === 0) {
      return null;
    }

    const action = result.completion[0].action.toLowerCase();
    const protocol = selectedProtocol.toLowerCase();

    switch (protocol) {
      case "thalaswap":
      case "liquidswap":
        if (action === "swap") {
          return {
            functionName: "swap",
            protocol: protocol
          };
        }
        break;
      case "echelon":
        if (action === "supply") {
          return {
            functionName: "supply",
            protocol: "echelon"
          };
        } else if (action === "borrow") {
          return {
            functionName: "borrow",
            protocol: "echelon"
          };
        }
        break;
      case "panora":
        if (action === "swap") {
          return {
            functionName: "swap",
            protocol: "panora"
          };
        }
        break;
    }

    return null;
  };

  const handleTransaction = async (result: any) => {
    const functionDetails = findFunctionFromPrompt(result);

    if (functionDetails) {
      const { token1, token2, amount } = result.completion[0];

      try {
        switch (functionDetails.protocol) {
          case "thalaswap":
            const txn = await thalaSwap(
              {
                token1: token1,
                token2: token2,
                address: account?.address || "",
                amount: parseFloat(amount)
              }
            );
            console.log("Thala Swap Transaction >>>", txn);
            
            break;
          case "liquidswap":
            await handleLiquidSwap(
              {
                token1: token1,
                token2: token2,
                address: account?.address || "",
                amount: parseFloat(amount)
              }
            );
            break;
          case "echelon":
            if (functionDetails.functionName === "supply") {
              await handleEchelonSupply();
            } else if (functionDetails.functionName === "borrow") {
              await handleEchelonBorrow();
            }
            break;
          case "panora":
            await handlePanoraSwap({
              token1: token1,
              token2: token2,
              address: account?.address || "",
              amount: parseFloat(amount)
            });
            break;
          default:
            console.error("Unknown protocol or action");
        }
      } catch (error) {
        console.error("Transaction error:", error);
      }
    } else {
      console.error("Function not found for the given prompt.");
    }
  };

  type SwapParams = {
    token1: string;
    token2: string;
    address: string;
    amount: number;
  };

  // Helper function to match token
  const findToken = (tokenName: string) => tokenlist.find(
    (token) => token.name.toLowerCase().includes(tokenName) || token.symbol.toLowerCase() === tokenName
  );

  async function handlePanoraSwap(panoraswap: SwapParams) {

    const privateKey = process.env.NEXT_PUBLIC_ADMIN_PK as string;
    const { token1, token2, address, amount } = panoraswap;

    // Find the fromToken and toToken based on user command
    const fromToken = findToken(token1); // Assuming the first token mentioned is after 'swap'
    const toToken = findToken(token2);   // Assuming the second token mentioned is after 'to'

    if (fromToken && toToken) {
      try {
        // Execute Panora swap function with the matched tokens
        const result = await client.ExactInSwap({
          "fromTokenAddress": fromToken.tokenAddress,
          "toTokenAddress": toToken.tokenAddress,
          "fromTokenAmount": amount.toString(), // Amount to swap (example)
          "toWalletAddress": address, // User's wallet address
        }, privateKey);
        console.log("Swap result:", result);
      } catch (error) {
        console.error("Error executing swap:", error);
      }
    } else {
      console.error("One or both tokens not found in the token list.");
    }
  }

  // @kamal transaction code

  // @abhishek This transaction is done for testnet amnis deposit and stake.
  const handleAmenisSwap = async () => {
    if (!account) return;
    // const transaction: InputTransactionData = {
    //   data: {
    //     function: "0xb8188ed9a1b56a11344aab853f708ead152484081c3b5ec081c38646500c42d7::router::deposit_and_stake_entry",
    //     functionArguments: [30000000, account?.address], // 1 is in Octas
    //   },
    // };
    const transaction: InputTransactionData = {
      data: {
        // type: 'entry_function_payload',
        function: '0x190d44266241744264b964a37b8f09863167a12d3e70cda39376cfb4e3561e12::scripts_v2::swap_unchecked',
        typeArguments: [
          '0x1::aptos_coin::AptosCoin',
          '0xcc8a89c8dce9693d354449f1f73e60e14e347417854f029db5bc8e7454008abb::coin::T',
          '0x190d44266241744264b964a37b8f09863167a12d3e70cda39376cfb4e3561e12::curves::Stable'
        ],
        functionArguments: ['1000000', '174381']
      },
    };

    try {
      const response = await signAndSubmitTransaction(transaction);
      await aptosClient(network).waitForTransaction({
        transactionHash: response.hash,
      });
      alert(`Success. Your transaction hash: ${response.hash}`)
    } catch (error) {
      console.error(error);
    }
  }

  // Thala Swap Quote and Swap Functions
  const router = new ThalaswapRouter(
    Network.MAINNET,
    "https://fullnode.mainnet.aptoslabs.com/v1",
    "0x48271d39d0b05bd6efca2278f22277d6fcc375504f9839fd73f74ace240861af",
    "0x60955b957956d79bc80b096d3e41bad525dd400d8ce957cdeb05719ed1e4fc26"
  );

  const getThalaSwapQuote = async () => {
    const fromToken = "0x1::aptos_coin::AptosCoin";
    const toToken = "0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC";
    const amountIn = 0.01;
    const quote = await handleGetThalaQuote({
      router,
      fromToken,
      toToken,
      amountIn
    })

    if (!quote) return null

    if (quote) {
      console.log("Quote route: ", quote);
      const amountOut = quote?.amountOut;
      console.log("Amount Out: ", amountOut);
      return quote
    }
  }

  const thalaSwap = async ( thalaswap: SwapParams) => {
    const route = await getThalaSwapQuote();
    if (!route) return

    try {
      const transactionPayload = router.encodeRoute(route!, 0.5);
      if (!transactionPayload) return;
      const response = await signAndSubmitTransaction({
        data: transactionPayload
      });
      await aptosClient(network).waitForTransaction({
        transactionHash: response.hash,
      });
      alert(`Success. Your transaction hash: ${response.hash}`)
    } catch (error) {
      console.log("Error in swapping >>>", error);
      return
    }
  }

  // Liquid Swap Quote and Swap
  const liquidSwapSDK = new SDK({
    nodeUrl: 'https://fullnode.mainnet.aptoslabs.com/v1', // Node URL, required
    /**
      networkOptions is optional
  
      networkOptions: {
        nativeToken: '0x1::aptos_coin::AptosCoin', - Type of Native network token
        modules: {
          Scripts:
            '0x190d44266241744264b964a37b8f09863167a12d3e70cda39376cfb4e3561e12::scripts_v2',  - This module is used for Swap
          CoinInfo: '0x1::coin::CoinInfo', - Type of base CoinInfo module
          CoinStore: '0x1::coin::CoinStore', - Type of base CoinStore module
        },
        resourceAccount: '0x05a97986a9d031c4567e15b797be516910cfcb4156312482efc6a19c0a30c948',
        moduleAccount: '0x190d44266241744264b964a37b8f09863167a12d3e70cda39376cfb4e3561e12',
        moduleAccountV05: '0x163df34fccbf003ce219d3f1d9e70d140b60622cb9dd47599c25fb2f797ba6e',
        resourceAccountV05: '0x61d2c22a6cb7831bee0f48363b0eec92369357aece0d1142062f7d5d85c7bef8'
      }
    */
  })

  const getLiquidSwapQuote = async () => {
    const fromToken = "0x1::aptos_coin::AptosCoin";
    const toToken = "0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC";
    const amountIn = 0.1;

    const amountOut = await handleGetLiquidQuote({
      sdk: liquidSwapSDK,
      fromToken,
      toToken,
      amountIn
    })

    if (!amountOut) return null

    if (amountOut) {
      console.log("Amount Out: ", amountOut);
      return amountOut
    }

  }

  async function registerCoinStore(account) {
    const sender = account.accountAddress;
    
    const coinType = "0x1::coin::USDC";

    // Build the payload to call the register function
    const payload = {
        type: "entry_function_payload",
        function: "0x1::coin::register", // Calling the register function in the coin module
        type_arguments: [coinType], // The specific coin you're registering
        arguments: [], // No arguments required for the register function
    };

    // Build the transaction
    // const transaction = await aptos.transaction.build.simple({
    //     sender: sender,
    //     data: payload,
    // });

    const transaction: InputTransactionData = {
      data: {
        function: "0x1::coin::register", // Calling the register function in the coin module
        typeArguments: [coinType], // The specific coin you're registering
        functionArguments: [], // No arguments required for the register function
      },
    };

    console.log("Transaction >>>", transaction);

    // Sign the transaction
    const signedTransaction = await signAndSubmitTransaction(transaction);
  }



  const handleLiquidSwap = async ( liquidSwap: SwapParams) => {
    // const fromToken = "0x1::aptos_coin::AptosCoin";
    // const toToken = "0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC";
    // const amountIn = 0.1;
    const { token1, token2, address, amount } = liquidSwap;


      // Find token addresses based on symbols
    const fromToken = tokenlist.find(token => token.symbol.toLowerCase() === token1.toLowerCase());
    const toToken = tokenlist.find(token => token.symbol.toLowerCase() === token2.toLowerCase());

    await registerCoinStore(account!);

  
    if (!fromToken || !toToken) {
      console.error("One or both tokens not found in the token list");
      return;
    }


    try {
      const amountOut = await getLiquidSwapQuote();
      const txPayload = liquidSwapSDK.Swap.createSwapTransactionPayload({
        fromToken: fromToken.tokenAddress,
        toToken: toToken.tokenAddress,
        fromAmount: convertValueToDecimal(amount, fromToken?.decimals),
        toAmount: Number(amountOut),
        interactiveToken: 'from',
        slippage: 0.005,
        stableSwapType: 'high',
        curveType: 'uncorrelated',
        version: 0
      })
      console.log(txPayload);

      const transaction: InputTransactionData = {
        data: {
          function: txPayload.function as `${string}::${string}::${string}`,
          typeArguments: txPayload.type_arguments,
          functionArguments: txPayload.arguments
        },
      }

      const response = await signAndSubmitTransaction(transaction);
      await aptosClient(network).waitForTransaction({
        transactionHash: response.hash,
      });
      alert(`Success. Your transaction hash: ${response.hash}`)
    } catch (error) {
      console.log("Error in swapping using liquid swap", error);

    }
  }

  const aptos = new Aptos(
    new AptosConfig({
      network: Network.MAINNET,
      fullnode: "https://fullnode.mainnet.aptoslabs.com/v1",
    })
  );

  const clientEchelon = new EchelonClient(aptos, "0xc6bc659f1649553c1a3fa05d9727433dc03843baac29473c817d06d39e7621ba");

  // console.log("clientEchelon >>>>", clientEchelon);

  const handleEchelonSupply = async () => {

    try {
      if (!account) return

      // make the below 2 args dynamic
      const supplyToken = "0x1::aptos_coin::AptosCoin";
      const supplyingAmount = 0.1;

      const tokenData = tokenlist.find((token) => token.tokenAddress.toLowerCase() === supplyToken.toLowerCase())

      const marketMapping = await clientEchelon.createMarketMapping();
      const marketData = marketMapping[supplyToken];

      const transactionPayload = clientEchelon.createSupplyPayload(
        supplyToken,
        marketData,
        convertValueToDecimal(supplyingAmount, tokenData?.decimals).toString()
      );

      console.log("Payload >>>", transactionPayload);

      const response = await signAndSubmitTransaction({
        data: transactionPayload
      });
      await aptosClient(network).waitForTransaction({
        transactionHash: response.hash,
      });
      alert(`Success. Your transaction hash: ${response.hash}`)

    } catch (error) {
      console.log("Error in supplying >>>>", error);

    }

  }

  const handleEchelonBorrow = async () => {
    try {
      if (!account) return

      const borrowToken = "0x1::aptos_coin::AptosCoin";
      const marketMapping = await clientEchelon.createMarketMapping();
      console.log("Market Mapping >>>", marketMapping);
      // For Eg, 10 Aptos Supply |..........| 6 USDC Borrow -> 1.6 , 
      // borrowable amount should be dynamic

      const marketData = marketMapping[borrowToken];
      console.log("marketData >>>", marketData);

      const amountBorrowable = await clientEchelon.getAccountBorrowable(account.address, marketData)
      console.log("User Can borrow this much amount >", amountBorrowable);

      const transactionPayload = clientEchelon.createBorrowPayload(
        borrowToken,
        marketData,
        amountBorrowable
      );

      console.log("Payload >>>", transactionPayload);

      const response = await signAndSubmitTransaction({
        data: transactionPayload
      });
      await aptosClient(network).waitForTransaction({
        transactionHash: response.hash,
      });
      alert(`Success. Your transaction hash: ${response.hash}`)

    } catch (error) {
      console.log("Error in requesting borrow >>>", error);

    }
  }

  const handleDisplayHealthFactor = async () => {
    if (!account) return

    try {
      const borrowToken = "0x1::aptos_coin::AptosCoin";
      const supplyingAmount = 0.1;
      const tokenData = tokenlist.find((token) => token.tokenAddress.toLowerCase() === borrowToken.toLowerCase())

      const marketMapping = await clientEchelon.createMarketMapping();
      console.log("Market Mapping >>>", marketMapping);

      const marketData = marketMapping[borrowToken];
      console.log("marketData >>>", marketData);

      const borrowHealthFactor = await clientEchelon.previewHealthFactorGivenSupply(
        account.address,
        marketData,
        convertValueToDecimal(supplyingAmount, tokenData?.decimals).toString()
      );
      console.log("Borrow Health factor >>>", borrowHealthFactor);
    } catch (error) {
      console.log("Error in displaying health factor >>>", error);

    }

  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl mx-auto h-[700px] flex flex-col bg-gray-800 text-white shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between px-6 py-4 bg-gray-700 rounded-t-xl">
          <CardTitle className="text-2xl font-bold">Aptos Siri</CardTitle>
          <div className="flex space-x-2">
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-[180px] bg-gray-600">
                <SelectValue placeholder="Select Language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en-US">English</SelectItem>
                <SelectItem value="es-ES">Español</SelectItem>
                <SelectItem value="fr-FR">Français</SelectItem>
                <SelectItem value="de-DE">Deutsch</SelectItem>
                <SelectItem value="it-IT">Italiano</SelectItem>
                <SelectItem value="pt-BR">Português</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedProtocol} onValueChange={setSelectedProtocol}>
              <SelectTrigger className="w-[180px] bg-gray-600">
                <SelectValue placeholder="Select Protocol" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="thalaswap">Thalaswap</SelectItem>
                <SelectItem value="liquidswap">Liquidswap</SelectItem>
                <SelectItem value="echelon">Echelon Market</SelectItem>
                <SelectItem value="panora">Panora Exchange</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="flex-grow overflow-auto px-6 py-4 space-y-4">
          {messages.map((message, index) => (
            <div key={index} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`flex items-start max-w-[80%] ${message.role === "user" ? "flex-row-reverse" : ""}`}>
                <Avatar className="w-10 h-10 mt-1">
                  <AvatarFallback>{message.role === "user" ? "U" : "AI"}</AvatarFallback>
                  {message.role === "assistant" && <AvatarImage src="/ai-avatar.png" alt="AI Assistant" />}
                </Avatar>
                <div className={`mx-2 p-3 rounded-lg ${message.role === "user" ? "bg-blue-600" : "bg-gray-700"}`}>
                  <p className="text-sm">{message.content}</p>
                  {message.originalContent && (
                    <p className="text-xs mt-1 text-gray-400">Original: {message.originalContent}</p>
                  )}
                  {message.canExecute && (
                    <Button onClick={() => executeTransaction(index)} className="mt-2" size="sm" variant="secondary">
                      <Play className="mr-1 h-3 w-3" />
                      Execute
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </CardContent>
        <CardFooter className="p-4 bg-gray-700 rounded-b-xl">
          <div className="flex w-full items-center space-x-2">
            <Button
              size="icon"
              variant={isListening ? "destructive" : "secondary"}
              onClick={toggleListening}
              className="w-12 h-12 flex-shrink-0"
            >
              {isListening ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
            </Button>
            {isEditing ? (
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyPress={handleKeyPress}
                className="flex-grow text-base bg-gray-600 border-gray-500"
                rows={3}
                placeholder={`Type your command in ${language === "en-US" ? "English" : "your selected language"}...`}
              />
            ) : (
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Type or speak your command...`}
                className="flex-grow text-base bg-gray-600 border-gray-500"
              />
            )}
            <Button
              size="icon"
              variant="outline"
              onClick={() => setIsEditing(!isEditing)}
              className="w-12 h-12 flex-shrink-0"
            >
              <PenSquare className="h-6 w-6" />
            </Button>
            <Button
              size="icon"
              onClick={handleSend}
              className="w-12 h-12 flex-shrink-0"
            >
              <Send className="h-6 w-6" />
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default TradewithAI;