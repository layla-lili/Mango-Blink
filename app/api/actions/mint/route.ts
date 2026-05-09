import {
  ActionError,
  ActionGetResponse,
  ActionPostRequest,
  ACTIONS_CORS_HEADERS,
  createPostResponse
} from "@solana/actions";
import { PublicKey } from "@solana/web3.js";
import { buildMintNftTransaction } from "@/lib/solana";

const THEME_ICON = `data:image/svg+xml,${encodeURIComponent(`
<svg xmlns='http://www.w3.org/2000/svg' width='512' height='512' viewBox='0 0 512 512'>
  <rect width='512' height='512' fill='#0F0A1A'/>
  <circle cx='256' cy='250' r='160' fill='#7C3AED'/>
  <circle cx='312' cy='196' r='58' fill='#F59E0B'/>
  <text x='256' y='428' text-anchor='middle' fill='#F59E0B' font-size='42' font-family='Arial'>Purple Mango</text>
</svg>
`)}`;

export const GET = async () => {
  const payload: ActionGetResponse = {
    icon: THEME_ICON,
    title: "Purple Mango: Design it. Mint it.",
    description:
      "Type a creative prompt below to generate a unique AI NFT and mint it to your wallet instantly.",
    label: "Generate & Mint",
    links: {
      actions: [
        {
          type: "transaction",
          label: "Generate & Mint",
          href: "/api/actions/mint?prompt={prompt}",
          parameters: [
            {
              name: "prompt",
              label: "Creative prompt",
              required: true
            }
          ]
        }
      ]
    }
  };

  return Response.json(payload, {
    headers: ACTIONS_CORS_HEADERS
  });
};

export const POST = async (req: Request) => {
  try {
    const body: ActionPostRequest & { prompt?: string } = await req.json();
    const requestUrl = new URL(req.url);
    const prompt = body.prompt ?? requestUrl.searchParams.get("prompt") ?? "Purple Mango art";

    if (!prompt.trim()) {
      throw new Error("Prompt is required");
    }

    const account = new PublicKey(body.account);
    const imageUrl = await simulateAiImageGeneration(prompt);

    const { transaction, mintPublicKey } = await buildMintNftTransaction({
      payer: account,
      imageUrl,
      prompt
    });

    const payload = await createPostResponse({
      fields: {
        type: "transaction",
        transaction,
        message: `Generated and prepared Purple Mango NFT mint (${mintPublicKey}).`
      }
    });

    return Response.json(payload, {
      headers: ACTIONS_CORS_HEADERS
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to build mint transaction";
    const payload: ActionError = {
      message
    };

    return Response.json(payload, {
      status: 400,
      headers: ACTIONS_CORS_HEADERS
    });
  }
};

export const OPTIONS = async () =>
  new Response(null, {
    headers: ACTIONS_CORS_HEADERS
  });

async function simulateAiImageGeneration(prompt: string): Promise<string> {
  const encodedPrompt = encodeURIComponent(prompt);

  return `https://dummyimage.com/1024x1024/7c3aed/f59e0b.png&text=${encodedPrompt}`;
}
