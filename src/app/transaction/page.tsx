"use client";
import brian from "@/lib/brian";
import { useWeb3ModalAccount } from "@web3modal/ethers/react";
import React, { useState } from "react";
import { useAccount } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
import { sendTransaction } from "@wagmi/core";
import { config } from "@/context/web3modal";

// utilising the panorama dex aggregator 

import Panora from "@panoraexchange/swap-sdk"

const TransactionPage = () => {
  const [prompt, setPrompt] = useState("");

  //Creating a new instance
  const client = new Panora({
    apiKey : process.env.NEXT_PUBLIC_APP_PANORA_API_KEY!,
    });
    

    

  const {
    address,
    isConnecting,
    isConnected,
    isDisconnected,
    chainId,
  } = useAccount();

  console.log("Address >>", address);

  const generatePrompt = async () => {
    const result = await brian.extract({
      prompt,
    });

    console.log("Result >>>", result);

    if (!isConnected) {
      alert("Connect your wallet");
      return;
    }

    if (result && address) {
      const transactionResult = await brian.transact({
        ...result,
        address: address,
        chainId: chainId ? `${chainId}` : `${mainnet.id}`,
      });

      console.log("Transaction Result:", transactionResult);

      const { data } = transactionResult[0];
      const { steps } = data;
      if (steps) {
        for (const step of steps) {
          const { from, to, value, data } = step;

          const tx = {
            from: from,
            to,
            value: BigInt(value), // Default to "0" if value is not provided
            data,
          };
          console.log("Tx >>", tx);

          try {
            const hash = await sendTransaction(config, tx);
            console.log("Transaction Hash >>", hash);
          } catch (error) {
            console.error("Transaction Error >>", error);
            break; // Stop further transactions if one fails
          }
        }
      }
    }
  };

  const getPromptParams = async () => {
    console.log("prompt", prompt);

    try {
      const res = await fetch('/api/extractParams', {
        method: 'POST',
        body: JSON.stringify({ prompt })
      })

      const response = await res.json();
      console.log("response", response);
    } catch (error) {
      console.log("Error", error);
    }

  }

  return (
    <div className="flex flex-col gap-4 mt-12 ">
      <div>
        <div>
          <input
            className="px-2 py-1 rounded-md bg-transparent border w-[500px]"
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
            }}
          />
        </div>
        <button
          onClick={getPromptParams}
          className="border rounded-md px-2 py-1 mt-8"
        >
          Generate
        </button>
      </div>
    </div>
  );
};

export default TransactionPage;
