import * as anchor from "@coral-xyz/anchor";
import { BN } from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { TokenRedactions } from "../target/types/token_redactions";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { ASSOCIATED_TOKEN_PROGRAM_ID, createAssociatedTokenAccountIdempotentInstruction, createInitializeInterestBearingMintInstruction, createInitializeMintInstruction, createInitializeTransferFeeConfigInstruction, createMintToInstruction, ExtensionType, getAssociatedTokenAddressSync, getMintLen, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";

describe("token-redactions", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.TokenRedactions as Program<TokenRedactions>;

  const provider = anchor.getProvider();

  const connection = provider.connection;

  const confirm = async (signature: string): Promise<string> => {
    const block = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature,
      ...block,
    });
    return signature;
  };

  const log = async (signature: string): Promise<string> => {
    console.log(
      `Your transaction signature: https://explorer.solana.com/transaction/${signature}?cluster=custom&customUrl=${connection.rpcEndpoint}`
    );
    return signature;
  };


  const [user, mintInterestBearing, mintTransferFee] = Array.from({ length: 4 }, () =>
    Keypair.generate()
  );

  const splMintInterestBearing = PublicKey.findProgramAddressSync([mintInterestBearing.publicKey.toBuffer()], program.programId)[0];
  const splMintTransferFee = PublicKey.findProgramAddressSync([mintTransferFee.publicKey.toBuffer()], program.programId)[0];

  const userTransferFeeATA = getAssociatedTokenAddressSync(mintTransferFee.publicKey, user.publicKey, undefined, TOKEN_2022_PROGRAM_ID);
  const userInterestBearingATA = getAssociatedTokenAddressSync(mintInterestBearing.publicKey, user.publicKey, undefined, TOKEN_2022_PROGRAM_ID);
  const userSplTransferFeeATA = getAssociatedTokenAddressSync(splMintTransferFee, user.publicKey, true, TOKEN_2022_PROGRAM_ID);
  const userSplInterestBearingATA = getAssociatedTokenAddressSync(splMintInterestBearing, user.publicKey, true, TOKEN_2022_PROGRAM_ID);
  const vaultTransferFeeATA = getAssociatedTokenAddressSync(mintTransferFee.publicKey, splMintTransferFee, true, TOKEN_2022_PROGRAM_ID);
  const vaultIntrestBearingATA = getAssociatedTokenAddressSync(mintInterestBearing.publicKey, splMintInterestBearing, true, TOKEN_2022_PROGRAM_ID);

  it("Airdrop and create tokens", async () => {
    const extensionsTF = [
      ExtensionType.TransferFeeConfig
    ];

    const extensionsIB = [
      ExtensionType.InterestBearingConfig
    ];

    const spaceTransferFee = getMintLen(extensionsTF);
    const spaceInterestBearing = getMintLen(extensionsIB);

    // Calculate rent exempt amount for mint account with extensions
    let lamportsTransferFee = await connection.getMinimumBalanceForRentExemption(spaceTransferFee);
    let lamportsInterestBearing = await connection.getMinimumBalanceForRentExemption(spaceInterestBearing);
    
    let tx = new Transaction();
    tx.instructions = [
      SystemProgram.transfer({
        fromPubkey: provider.publicKey,
        toPubkey: user.publicKey,
        lamports: 10 * LAMPORTS_PER_SOL,
      }),
      SystemProgram.createAccount({
        fromPubkey: provider.publicKey,
        newAccountPubkey: mintTransferFee.publicKey,
        lamports: lamportsTransferFee,
        space: spaceTransferFee,
        programId: TOKEN_2022_PROGRAM_ID
      }),
      SystemProgram.createAccount({
        fromPubkey: provider.publicKey,
        newAccountPubkey: mintInterestBearing.publicKey,
        lamports: lamportsInterestBearing,
        space: spaceInterestBearing,
        programId: TOKEN_2022_PROGRAM_ID
      }),
      // Initialize transfer fee extension
      createInitializeTransferFeeConfigInstruction(
        mintTransferFee.publicKey,
        null,
        provider.publicKey!,
        200,
        20000000000000000n, // u64 Max
        TOKEN_2022_PROGRAM_ID
      ),
      // Initialize transfer fee extension
      createInitializeInterestBearingMintInstruction(
        mintInterestBearing.publicKey,
        provider.publicKey!,
        200,
        TOKEN_2022_PROGRAM_ID
      ),
      // Create mint
      createInitializeMintInstruction(
        mintTransferFee.publicKey,
        6,
        provider.publicKey,
        null,
        TOKEN_2022_PROGRAM_ID,
      ),
      createInitializeMintInstruction(
        mintInterestBearing.publicKey,
        6,
        provider.publicKey,
        null,
        TOKEN_2022_PROGRAM_ID,
      ),
      createAssociatedTokenAccountIdempotentInstruction(
        provider.publicKey,
        userTransferFeeATA,
        user.publicKey,
        mintTransferFee.publicKey,
        TOKEN_2022_PROGRAM_ID
      ),
      createAssociatedTokenAccountIdempotentInstruction(
        provider.publicKey,
        userInterestBearingATA,
        user.publicKey,
        mintInterestBearing.publicKey,
        TOKEN_2022_PROGRAM_ID
      ),
      createMintToInstruction(
        mintTransferFee.publicKey,
        userTransferFeeATA,
        provider.publicKey,
        1823981289,
        undefined,
        TOKEN_2022_PROGRAM_ID
      ),
      createMintToInstruction(
        mintInterestBearing.publicKey,
        userInterestBearingATA,
        provider.publicKey,
        3784924749,
        undefined,
        TOKEN_2022_PROGRAM_ID
      )
    ];
    await provider.sendAndConfirm(tx, [
      mintTransferFee,
      mintInterestBearing
    ]).then(log);
  })

  it("Initialize an Interest Bearing Token vault", async () => {
    await program.methods.init()
    .accounts({
      signer: user.publicKey,
      mint: mintInterestBearing.publicKey,
    })
    .signers([
      user
    ])
    .rpc()
    .then(confirm)
    .then(log)
  })

  it("Wrap an Interest Bearing Token", async () => {
    await program.methods.wrap(new BN(1000000))
    .accounts({
      signer: user.publicKey,
      mint: mintInterestBearing.publicKey,
      tokenAccount: userInterestBearingATA,
    })
    .signers([
      user
    ]) 
    .rpc({ skipPreflight: true })
    .then(confirm)
    .then(log)
  })

  it("Initialize a Transfer Fee Token vault", async () => {
    await program.methods.init()
    .accounts({
      signer: user.publicKey,
      mint: mintTransferFee.publicKey,
    })
    .signers([
      user
    ])
    .rpc()
    .then(confirm)
    .then(log)
  })

  it("Wrap a Transfer Fee Token", async () => {
    await program.methods.wrap(new BN(1000000))
    .accounts({
      signer: user.publicKey,
      mint: mintTransferFee.publicKey,
      tokenAccount: userTransferFeeATA,
    })
    .signers([
      user
    ]) 
    .rpc({ skipPreflight: true })
    .then(confirm)
    .then(log)
  })

  it("Unwrap an Interest Bearing Token", async () => {
    await program.methods.unwrap(new BN(1000000))
    .accounts({
      signer: user.publicKey,
      mint: mintInterestBearing.publicKey,
    })
    .signers([
      user
    ]) 
    .rpc({ skipPreflight: true })
    .then(confirm)
    .then(log)
  })

  it("Unwrap an Transfer Fee Token", async () => {
    await program.methods.unwrap(new BN(980000))
    .accounts({
      signer: user.publicKey,
      mint: mintTransferFee.publicKey,
    })
    .signers([
      user
    ]) 
    .rpc({ skipPreflight: true })
    .then(confirm)
    .then(log)
  })

  it("Wrap a Transfer Fee token", async () => {
    await program.methods.wrap(new BN(1000000))
    .accounts({
      signer: user.publicKey,
      mint: mintTransferFee.publicKey,
      tokenAccount: userTransferFeeATA,
    })
    .signers([
      user
    ]) 
    .rpc({ skipPreflight: true })
    .then(confirm)
    .then(log)
  })
});
