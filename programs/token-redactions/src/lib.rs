use anchor_lang::prelude::*;
pub mod contexts;
use contexts::*;

declare_id!("1VtUaKYY2WwvXzvtqg7cEuvqnBUkNM6cwakizicLmYh");

#[program]
pub mod token_redactions {
    use super::*;
    pub fn init(_ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }

    pub fn wrap(ctx: Context<Wrap>, amount: u64) -> Result<()> {
        // Get the starting balance of the vault handle exact fee calculation
        let starting_balance = ctx.accounts.vault.amount;
        ctx.accounts.deposit_token_extension_token(amount)?;
        ctx.accounts.mint_spl_token(starting_balance, &[ctx.bumps.spl_mint])
    }

    pub fn unwrap(ctx: Context<Unwrap>, amount: u64) -> Result<()> {
        ctx.accounts.burn_spl_token(amount)?;
        ctx.accounts.withdraw_token_2022_token(amount, &[ctx.bumps.spl_mint])
    }
}