"use client";

import { useState, useEffect, useRef } from "react";
import { default as languageCodesData } from "@/data/language-codes.json";
import { default as countryCodesData } from "@/data/country-codes.json";
import brian from "@/lib/brian";
import React from "react";
import { Button } from "./ui/button";
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


const languageCodes: Record<string, string> = languageCodesData;
const countryCodes: Record<string, string> = countryCodesData;

const TradewithAI = () => {
  const recognitionRef = useRef<SpeechRecognition>();

  const client = new Panora({
    apiKey: process.env.NEXT_PUBLIC_APP_PANORA_API_KEY!,
  });

  const [isActive, setIsActive] = useState<boolean>(false);
  const [text, setText] = useState<string>();
  const [translation, setTranslation] = useState<string>("");
  const [voices, setVoices] = useState<Array<SpeechSynthesisVoice>>();
  const [language, setLanguage] = useState<string>("pt-BR");
  const [languageCode, setLanguageCode] = useState<string>("pt");
  const {
    account,
    network,
    signAndSubmitTransaction,
  } = useWallet();

  const isSpeechDetected = false;

  console.log("language", language);

  const availableLanguages = Array.from(
    new Set(voices?.map(({ lang }) => lang))
  )
    .map((lang) => {
      const split = lang.split("-");
      const languageCode: string = split[0];
      const countryCode: string = split[1];
      return {
        lang,
        label: languageCodes[languageCode] || lang,
        dialect: countryCodes[countryCode],
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
  const activeLanguage = availableLanguages.find(
    ({ lang }) => language === lang
  );

  const availableVoices = voices?.filter(({ lang }) => lang === language);
  const activeVoice =
    availableVoices?.find(({ name }) => name.includes("Google")) ||
    availableVoices?.find(({ name }) => name.includes("Luciana")) ||
    availableVoices?.[0];

  useEffect(() => {
    const voices = window.speechSynthesis.getVoices();
    if (Array.isArray(voices) && voices.length > 0) {
      setVoices(voices);
      return;
    }
    if ("onvoiceschanged" in window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = function () {
        const voices = window.speechSynthesis.getVoices();
        setVoices(voices);
      };
    }
  }, []);

  const privateKey = process.env.NEXT_PUBLIC_ADMIN_PK as string;

  // @abhishek Helper function to find the correct function and arguments from the protocol mapping
  const findFunctionFromPrompt = (prompt: string) => {
    for (const [protocol, functions] of Object.entries(protocolMappings)) {
      if (prompt.toLowerCase().includes(protocol.toLowerCase())) {
        return functions.find((fn) => prompt.toLowerCase().includes(fn.functionName));
      }
    }
    return null;
  };


  async function handleTransaction(prompt: string) {
    const functionDetails = findFunctionFromPrompt(prompt);

    if (functionDetails) {
      const transaction: InputTransactionData = {
        data: {
          function: functionDetails.functionFullPath,
          type_arguments: functionDetails.typeArgs,
          arguments: functionDetails.args,
        },
      };
      try {
        const response = await signAndSubmitTransaction(transaction);
        await aptosClient(network).waitForTransaction({
          transactionHash: response.hash,
        });
        alert(`Success. Your transaction hash: ${response.hash}`);
      } catch (error) {
        console.error("Transaction error:", error);
      }
    } else {
      console.error("Function not found for the given prompt.");
    }
  }

  type PanoraSwapParams = {
    chain?: string;
    token1: string;
    token2: string;
    address: string;
    amount: number;
  };

  async function handleSwap(panoraswap: PanoraSwapParams) {

    const { chain, token1, token2, address, amount } = panoraswap;

    // Helper function to match token
    const findToken = (tokenName: string) => tokenlist.find(
      (token) => token.name.toLowerCase().includes(tokenName) || token.symbol.toLowerCase() === tokenName
    );

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


  function handleOnRecord() {
    if (isActive) {
      recognitionRef.current?.stop();
      setIsActive(false);
      return;
    }

    speak(" ");

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();

    recognitionRef.current.onstart = function () {
      setIsActive(true);
    };

    recognitionRef.current.onend = function () {
      setIsActive(false);
    };

    recognitionRef.current.onresult = async function (event) {
      const transcript = event.results[0][0].transcript;

      setText(transcript);

      if (languageCode === "en") {
        speak(transcript);
      } else {
        const results = await fetch("/api/translate", {
          method: "POST",
          body: JSON.stringify({
            text: transcript,
            language: "en",
          }),
        }).then((r) => r.json());

        const translatedText = results.text;
        setTranslation(translatedText);

        speak(translatedText);
      }

      // Extract parameters from the translated text and execute transaction
      const transactionParams = await brian.extract({
        prompt: languageCode === "en" ? transcript : translation,
      });

      const { action } = transactionParams.completion[0];

      if (transactionParams !== null && action === "swap") {
        handleSwap(transactionParams.completion[0]);
      }
      console.log("transactionParams", transactionParams);


    };

    recognitionRef.current.start();
  }

  function speak(text: string) {
    const utterance = new SpeechSynthesisUtterance(text);

    if (activeVoice) {
      utterance.voice = activeVoice;
    }

    window.speechSynthesis.speak(utterance);
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


  const thalaSwap = async () => {
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


  const handleLiquidSwap = async () => {
    const fromToken = "0x1::aptos_coin::AptosCoin";
    const toToken = "0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC";
    const amountIn = 0.1;

    try {
      const amountOut = await getLiquidSwapQuote();
      const txPayload = liquidSwapSDK.Swap.createSwapTransactionPayload({
        fromToken: fromToken,
        toToken: toToken,
        fromAmount: convertValueToDecimal(amountIn, 8),
        toAmount: Number(amountOut),
        interactiveToken: 'from',
        slippage: 0.005, // 0.5% (1 - 100%, 0 - 0%)
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

  console.log("clientEchelon >>>>", clientEchelon);

  const handleEchelonBorrow = async () => {
    try {
      if (!account) return
      const markets = await clientEchelon.getAllMarkets();
      console.log("markets >>>", markets);

      const market = markets[0]; // use the first market as an example
      const coin = await clientEchelon.getMarketCoin(market);

      console.log("Coin >>>", coin);

      const accountBorrowable = await clientEchelon.getAccountBorrowable(account?.address, market);
      console.log("accountBorrowable >>>", accountBorrowable);

      const transactionPayload = clientEchelon.createSupplyPayload(
        coin,
        market,
        "106161"
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
      console.log("Error >>>", error);

    }
  }



  return (
    <div className="mt-12 px-4">
      <div className="max-w-lg rounded-xl overflow-hidden mx-auto">
        <div className="bg-zinc-200 p-4 border-b-4 border-zinc-300">
          <div className="bg-blue-200 rounded-lg p-2 border-2 border-blue-300">
            <h2 className="text-center text-blue-400">AI Vocal Trades</h2>
            <ul className="font-mono font-bold text-blue-900 uppercase px-4 py-2 border border-blue-800 rounded">
              <li>&gt; Translation Mode: {activeLanguage?.label}</li>
              <li>&gt; Dialect: {activeLanguage?.dialect}</li>
            </ul>
          </div>
        </div>

        <div className="bg-zinc-800 p-4 border-b-4 border-zinc-950">
          <p className="flex items-center gap-3">
            <span
              className={`block rounded-full w-5 h-5 flex-shrink-0 flex-grow-0 ${isActive ? "bg-red-500" : "bg-red-900"
                } `}
            >
              <span className="sr-only">
                {isActive ? "Actively recording" : "Not actively recording"}
              </span>
            </span>
            <span
              className={`block rounded w-full h-5 flex-grow-1 ${isSpeechDetected ? "bg-green-500" : "bg-green-900"
                }`}
            >
              <span className="sr-only">
                {isSpeechDetected
                  ? "Speech is being recorded"
                  : "Speech is not being recorded"}
              </span>
            </span>
          </p>
        </div>

        <div className="bg-zinc-800 p-4">
          <div className="grid sm:grid-cols-2 gap-4 max-w-lg bg-zinc-200 rounded-lg p-5 mx-auto">
            <form>
              <div>
                <label className="block text-zinc-500 text-[.6rem] uppercase font-bold mb-1">
                  Language
                </label>
                <select
                  className="w-full text-[.7rem] rounded-sm border-zinc-300 px-2 py-1 pr-7"
                  name="language"
                  value={language}
                  onChange={(event) => {
                    setLanguage(event.currentTarget.value);
                    setLanguageCode(event.currentTarget.value.split("-")[0]);
                  }}
                >
                  {availableLanguages.map(({ lang, label }) => {
                    return (
                      <option key={lang} value={lang}>
                        {label} ({lang})
                      </option>
                    );
                  })}
                </select>
              </div>
            </form>
            <p>
              <Button
                className={`w-full h-full uppercase font-semibold text-sm  ${isActive
                  ? "text-white bg-red-500"
                  : "text-zinc-400 bg-zinc-900"
                  } color-white py-3 rounded-sm`}
                onClick={handleOnRecord}
              >
                {isActive ? "Stop" : "Record"}
              </Button>
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto mt-12">
        <p className="mb-4">Spoken Text: {text}</p>
        {languageCode !== "en" && <p className="mb-4">Translation: {translation}</p>}

        <div className="flex gap-8">
          <Button onClick={handleAmenisSwap}>
            Amenis Swap
          </Button>
          <Button onClick={thalaSwap}>
            Thala Swap
          </Button>
          <Button onClick={handleLiquidSwap}>
            Liquid Swap
          </Button>
          <Button onClick={handleEchelonBorrow}>
            Echelon Borrow
          </Button>
        </div>

        {/* <Button
          onClick={generatePrompt}
          className="border rounded-md px-2 py-1 mt-8"
        >
          Execute the transaction
        </Button> */}
      </div>
    </div>
  );
};

export default TradewithAI;
