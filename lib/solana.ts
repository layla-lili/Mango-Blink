import {
  createCreateMasterEditionV3Instruction,
  createCreateMetadataAccountV3Instruction,
  PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID
} from "@metaplex-foundation/mpl-token-metadata";
import {
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  MINT_SIZE,
  TOKEN_PROGRAM_ID
} from "@solana/spl-token";
import {
  clusterApiUrl,
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction
} from "@solana/web3.js";

export const SOLANA_CONNECTION = new Connection(clusterApiUrl("devnet"), "confirmed");

const NFT_SYMBOL = "PMAI";
const FALLBACK_MINT_RENT_LAMPORTS = 1_500_000;
const FALLBACK_RECENT_BLOCKHASH = "11111111111111111111111111111111";

export async function buildMintNftTransaction({
  payer,
  imageUrl,
  prompt
}: {
  payer: PublicKey;
  imageUrl: string;
  prompt: string;
}) {
  const mint = Keypair.generate();
  const tokenAccount = getAssociatedTokenAddressSync(mint.publicKey, payer);

  const [metadataPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mint.publicKey.toBuffer()],
    TOKEN_METADATA_PROGRAM_ID
  );
  const [masterEditionPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.publicKey.toBuffer(),
      Buffer.from("edition")
    ],
    TOKEN_METADATA_PROGRAM_ID
  );

  const transaction = new Transaction();
  const rentExemptionLamports = await SOLANA_CONNECTION
    .getMinimumBalanceForRentExemption(MINT_SIZE)
    .catch(() => FALLBACK_MINT_RENT_LAMPORTS);

  transaction.add(
    SystemProgram.createAccount({
      fromPubkey: payer,
      newAccountPubkey: mint.publicKey,
      space: MINT_SIZE,
      lamports: rentExemptionLamports,
      programId: TOKEN_PROGRAM_ID
    }),
    createInitializeMintInstruction(mint.publicKey, 0, payer, payer),
    createAssociatedTokenAccountInstruction(payer, tokenAccount, payer, mint.publicKey),
    createMintToInstruction(mint.publicKey, tokenAccount, payer, 1),
    createCreateMetadataAccountV3Instruction(
      {
        metadata: metadataPda,
        mint: mint.publicKey,
        mintAuthority: payer,
        payer,
        updateAuthority: payer
      },
      {
        createMetadataAccountArgsV3: {
          data: {
            name: `Purple Mango AI #${Date.now()}`.slice(0, 32),
            symbol: NFT_SYMBOL,
            uri: imageUrl,
            sellerFeeBasisPoints: 500,
            creators: null,
            collection: null,
            uses: null
          },
          isMutable: true,
          collectionDetails: null
        }
      }
    ),
    createCreateMasterEditionV3Instruction(
      {
        edition: masterEditionPda,
        mint: mint.publicKey,
        updateAuthority: payer,
        mintAuthority: payer,
        payer,
        metadata: metadataPda
      },
      {
        createMasterEditionArgs: {
          maxSupply: 0
        }
      }
    )
  );

  const { blockhash, lastValidBlockHeight } = await SOLANA_CONNECTION
    .getLatestBlockhash()
    .catch(() => ({
      blockhash: FALLBACK_RECENT_BLOCKHASH,
      lastValidBlockHeight: 0
    }));
  transaction.feePayer = payer;
  transaction.recentBlockhash = blockhash;
  transaction.lastValidBlockHeight = lastValidBlockHeight;
  transaction.partialSign(mint);

  return {
    transaction,
    mintPublicKey: mint.publicKey.toBase58(),
    metadataUri: imageUrl,
    prompt
  };
}
