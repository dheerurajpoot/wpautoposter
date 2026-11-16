import fs from 'fs';
import path from 'path';

/**
 * Manual USDT Crypto Payment Service.
 * Supports: TRC-20 (Tron), BEP-20 (BNB Smart Chain).
 */

export interface CryptoDepositConfig {
    trc20Address: string;
    bep20Address: string;
    depositAddresses: {
        TRC20: string;
        BEP20: string;
        [key: string]: string;
    };
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
    private configFilePath: string;

    constructor() {
        this.configFilePath = path.resolve(process.cwd(), 'data', 'crypto-config.json');

        // Defaults from environment or fallback placeholders
        let envTrc20 = process.env.USDT_TRC20_WALLET_ADDRESS || 'TW1234567890abcdefghijklmnopqrstuvwxyz';
        let envBep20 = process.env.USDT_BEP20_WALLET_ADDRESS || '0x1234567890abcdef1234567890abcdef12345678';

        // Check if persistent config file exists in data directory
        try {
            if (fs.existsSync(this.configFilePath)) {
                const raw = fs.readFileSync(this.configFilePath, 'utf8');
                const parsed = JSON.parse(raw);
                if (parsed.trc20Address && parsed.trc20Address.trim()) {
                    envTrc20 = parsed.trc20Address.trim();
                }
                if (parsed.bep20Address && parsed.bep20Address.trim()) {
                    envBep20 = parsed.bep20Address.trim();
                }
            }
        } catch {
            // Ignore file read error and keep env values
        }

        this.trc20Address = envTrc20;
        this.bep20Address = envBep20;
    }

    /**
     * Get deposit address and supported network information
     */
    getDepositInfo(): CryptoDepositConfig {
        return {
            trc20Address: this.trc20Address,
            bep20Address: this.bep20Address,
            depositAddresses: {
                TRC20: this.trc20Address,
                BEP20: this.bep20Address,
            },
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
     * Update official deposit addresses and persist to disk
     */
    updateDepositAddresses(trc20: string, bep20: string): void {
        this.trc20Address = (trc20 || '').trim() || this.trc20Address;
        this.bep20Address = (bep20 || '').trim() || this.bep20Address;

        try {
            const dataDir = path.dirname(this.configFilePath);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }
            fs.writeFileSync(
                this.configFilePath,
                JSON.stringify(
                    {
                        trc20Address: this.trc20Address,
                        bep20Address: this.bep20Address,
                        updatedAt: new Date().toISOString(),
                    },
                    null,
                    2
                ),
                'utf8'
            );
        } catch (err) {
            console.error('Failed to persist crypto config file:', err);
        }
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

