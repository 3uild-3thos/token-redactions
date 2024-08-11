use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token::Token, token_2022::Token2022, token_interface::{Mint, TokenAccount}};

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    // Token Extensions Accounts
    #[account(
        mint::token_program = token_2022_program,
    )]
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = mint,
        associated_token::authority = spl_mint,
        associated_token::token_program = token_2022_program,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    // SPL Token Accounts
    #[account(
        init,
        payer = signer,
        mint::decimals = mint.decimals,
        mint::authority = spl_mint,
        mint::token_program = token_program,
        seeds = [mint.key().as_ref()],
        bump,
    )]
    pub spl_mint: InterfaceAccount<'info, Mint>,
    // Programs
    pub token_program: Program<'info, Token>,
    pub token_2022_program: Program<'info, Token2022>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}