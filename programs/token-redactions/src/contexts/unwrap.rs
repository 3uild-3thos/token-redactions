use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token::Token, token_2022::Token2022, token_interface::{burn, transfer_checked, Burn, Mint, TokenAccount, TransferChecked}};

#[derive(Accounts)]
pub struct Unwrap<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    // Token Extensions Accounts
    pub mint: InterfaceAccount<'info, Mint>, 
    #[account(
        init_if_needed,
        payer = signer,
        associated_token::mint = mint,
        associated_token::authority = signer,
        associated_token::token_program = token_2022_program,
    )]
    pub token_account: InterfaceAccount<'info, TokenAccount>,
    #[account(
        mut,
        associated_token::mint = mint,
        associated_token::authority = spl_mint,
        associated_token::token_program = token_2022_program,
    )]
    pub vault: InterfaceAccount<'info, TokenAccount>,
    // SPL Accounts
    #[account(
        mut,
        mint::decimals = mint.decimals,
        mint::authority = spl_mint,
        mint::token_program = token_program,
        seeds = [mint.key().as_ref()],
        bump,
    )]
    pub spl_mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        associated_token::mint = spl_mint,
        associated_token::authority = signer,
        associated_token::token_program = token_program,
    )]
    pub spl_token_account: InterfaceAccount<'info, TokenAccount>,
    // Programs
    pub token_program: Program<'info, Token>,
    pub token_2022_program: Program<'info, Token2022>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl<'info> Unwrap<'info> {
    pub fn burn_spl_token(&self, amount: u64) -> Result<()> {
        // Define burn accounts
        let accounts = Burn {
            mint: self.spl_mint.to_account_info(),
            from: self.spl_token_account.to_account_info(),
            authority: self.signer.to_account_info(),
        };
        
        // Define CPI context
        let ctx = CpiContext::new(
            self.token_program.to_account_info(), 
            accounts
        );
        
        // Burn SPL tokens
        burn(ctx, amount)
    }

    pub fn withdraw_token_2022_token(&self, amount: u64, bump: &[u8]) -> Result<()> {
        // Define signer seeds
        let signer_seeds = [&[self.mint.to_account_info().key.as_ref(), bump][..]];

        // Define deposit accounts
        let accounts = TransferChecked {
            from: self.vault.to_account_info(),
            to: self.token_account.to_account_info(),
            mint: self.mint.to_account_info(),
            authority: self.spl_mint.to_account_info()
        };

        // Define CPI context
        let ctx = CpiContext::new_with_signer(
            self.token_2022_program.to_account_info(),
            accounts,
            &signer_seeds
        );

        // Execute transfer
        transfer_checked(ctx, amount, self.mint.decimals)
    }

}