/**
 * Manual USDT Crypto Payment Service.
 * Supports: TRC-20 (Tron), BEP-20 (BNB Smart Chain).
 */

export interface CryptoDepositConfig {
    trc20Address: string;
    bep20Address: string;
    networks: Array<{
        id: string;
        name: string;
        address: string;
        explorerUrl: string;
        recommended: boolean;
        feeNote: string;
    }>;
}

export class CryptoService {
    private trc20Address: string;
    private bep20Address: string;

    constructor() {
        this.trc20Address =
            process.env.USDT_TRC20_WALLET_ADDRESS || 'TW1234567890abcdefghijklmnopqrstuvwxyz';
        this.bep20Address =
            process.env.USDT_BEP20_WALLET_ADDRESS || '0x1234567890abcdef1234567890abcdef12345678';
    }

    /**
     * Get deposit address and supported network information
     */
    getDepositInfo(): CryptoDepositConfig {
        return {
            trc20Address: this.trc20Address,
            bep20Address: this.bep20Address,
            networks: [
                {
                    id: 'TRC20',
                    name: 'TRON (TRC-20)',
                    address: this.trc20Address,
                    explorerUrl: 'https://tronscan.org/#/transaction/',
                    recommended: true,
                    feeNote: '~1-2 USDT network fee (Fastest & lowest fees)',
                },
                {
                    id: 'BEP20',
                    name: 'BNB Smart Chain (BEP-20)',
                    address: this.bep20Address,
                    explorerUrl: 'https://bscscan.com/tx/',
                    recommended: false,
                    feeNote: '~0.5 USDT network fee',
                },
            ],
        };
    }

    /**
     * Get block explorer link for a given network and transaction hash
     */
    getExplorerUrl(network: string, txHash: string): string {
        const cleanTx = (txHash || '').trim();
        if (network.toUpperCase() === 'TRC20') {
            return `https://tronscan.org/#/transaction/${cleanTx}`;
        }
        if (network.toUpperCase() === 'BEP20') {
            return `https://bscscan.com/tx/${cleanTx}`;
        }
        return `https://etherscan.io/tx/${cleanTx}`;
    }
}

export const cryptoService = new CryptoService();

