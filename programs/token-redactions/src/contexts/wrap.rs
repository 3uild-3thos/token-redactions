use anchor_lang::prelude::*;
use anchor_spl::{associated_token::AssociatedToken, token::Token, token_2022::Token2022, token_interface::{Mint, TokenAccount, MintTo, mint_to, TransferChecked, transfer_checked}};

#[derive(Accounts)]
pub struct Wrap<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,
    // Token Extensions Accounts
    pub mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        token::mint = mint,
        token::authority = signer,
        token::token_program = token_2022_program,
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
        seeds = [mint.key().as_ref()],
        bump,
    )]
    pub spl_mint: InterfaceAccount<'info, Mint>,
    #[account(
        init_if_needed,
        payer = signer,
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

impl<'info> Wrap<'info> {
    pub fn deposit_token_extension_token(&mut self, amount: u64) -> Result<()> {
        // Define deposit accounts
        let accounts = TransferChecked {
            from: self.token_account.to_account_info(),
            mint: self.mint.to_account_info(),
            to: self.vault.to_account_info(),
            authority: self.signer.to_account_info()
        };

        msg!("got here");
        // Define CPI context
        let ctx = CpiContext::new(self.token_2022_program.to_account_info(), accounts);
        msg!("got here");
        // Execute transfer
        transfer_checked(ctx, amount, self.mint.decimals)
    }

    pub fn mint_spl_token(&mut self, starting_balance: u64, bump: &[u8]) -> Result<()> {
        // Explicitly refresh vault balance
        self.vault.reload()?;

        // Calculate difference between starting balance and balance after deposit
        let amount = self.vault.amount.checked_sub(starting_balance).ok_or(ProgramError::ArithmeticOverflow)?;

        // Define signer seeds
        let signer_seeds = [&[self.mint.to_account_info().key.as_ref(), bump][..]];

        // Define mint to accounts
        let accounts = MintTo {
            mint: self.spl_mint.to_account_info(),
            to: self.spl_token_account.to_account_info(),
            authority: self.spl_mint.to_account_info()
        };

        // Define CPI context
        let ctx = CpiContext::new_with_signer(
            self.token_program.to_account_info(), 
            accounts, 
            &signer_seeds
        );
        
        // Mint SPL tokens to account
        mint_to(ctx, amount)
    }
}