import { BRIAN_API } from "@/config/url.config";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { prompt } = await req.json();

  try {
    const res = await fetch(`${BRIAN_API}/agent/parameters-extraction`, {
      method: "POST",
      headers: {
        "x-brian-api-key": process.env.NEXT_PUBLIC_BRIAN_API_KEY as string,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: prompt,
      }),
    });
    const response = await res.json();
    return NextResponse.json({ data: response }, { status: 200 });
  } catch (error) {
    console.error("Fetch error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
