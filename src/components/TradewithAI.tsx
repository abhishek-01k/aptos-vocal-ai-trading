"use client";

import { useState, useEffect, useRef } from "react";
import { default as languageCodesData } from "@/data/language-codes.json";
import { default as countryCodesData } from "@/data/country-codes.json";
import brian from "@/lib/brian";
import React from "react";
import { Button } from "./ui/button";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { default as tokenlist } from "@/config/token-list.json";
import Panora from "@panoraexchange/swap-sdk"

const languageCodes: Record<string, string> = languageCodesData;
const countryCodes: Record<string, string> = countryCodesData;

const TradewithAI = () => {
  const recognitionRef = useRef<SpeechRecognition>();

  const client = new Panora({
    apiKey : process.env.NEXT_PUBLIC_APP_PANORA_API_KEY!,
    });

  const [isActive, setIsActive] = useState<boolean>(false);
  const [text, setText] = useState<string>();
  const [translation, setTranslation] = useState<string>("");
  const [voices, setVoices] = useState<Array<SpeechSynthesisVoice>>();
  const [language, setLanguage] = useState<string>("pt-BR");
  const [languageCode, setLanguageCode] = useState<string>("pt");


  const { account } = useWallet();

  const isSpeechDetected = false;

  console.log("language",language);

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

  type PanoraSwapParams = {
    chain?: string;
    token1: string;
    token2: string;
    address: string;
    amount: number;
  };

  async function handleSwap(panoraswap : PanoraSwapParams) {

    const { chain, token1, token2, address, amount } = panoraswap;

    // Helper function to match token
    const findToken = (tokenName : string) => tokenlist.find(
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
        }, privateKey );
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

      if(languageCode === "en") {
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

      if(transactionParams !== null && action === "swap") {
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
              className={`block rounded-full w-5 h-5 flex-shrink-0 flex-grow-0 ${
                isActive ? "bg-red-500" : "bg-red-900"
              } `}
            >
              <span className="sr-only">
                {isActive ? "Actively recording" : "Not actively recording"}
              </span>
            </span>
            <span
              className={`block rounded w-full h-5 flex-grow-1 ${
                isSpeechDetected ? "bg-green-500" : "bg-green-900"
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
                className={`w-full h-full uppercase font-semibold text-sm  ${
                  isActive
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
