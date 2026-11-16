/**
 * Public Billing Callbacks (PayU Webhook / Return).
 */

import { Router, Request, Response } from 'express';
import { payuService } from '../services/payu-service';
import { tenantStore } from '../services/tenant-store';
import { logger } from '../logger';

export const billingCallbackRouter = Router();

function sendRedirectResponse(res: Response, targetUrl: string) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta http-equiv="refresh" content="0;url=${targetUrl}">
    <title>Redirecting to Subscription Dashboard...</title>
    <script>
        window.location.replace("${targetUrl}");
    </script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            background: #f8fafc;
            color: #1e293b;
        }
        .card {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 32px;
            text-align: center;
            max-width: 440px;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
        }
        .spinner {
            width: 36px;
            height: 36px;
            border: 3px solid #e2e8f0;
            border-top-color: #4f46e5;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin: 0 auto 16px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        a {
            color: #4f46e5;
            text-decoration: underline;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="spinner"></div>
        <h3 style="margin: 0 0 8px; font-size: 18px;">Payment Processed</h3>
        <p style="margin: 0 0 16px; color: #64748b; font-size: 14px;">Redirecting you back to your subscription dashboard...</p>
        <p><a href="${targetUrl}">Click here if you are not redirected automatically</a></p>
    </div>
</body>
</html>`);
}

// PayU return callback (POST from PayU gateway)
billingCallbackRouter.post('/payu/callback', async (req: Request, res: Response) => {
    const frontendUrl = 'https://wpautoposter.com';
    try {
        const body = req.body || {};
        logger.info('PayU callback received', { txnid: body.txnid, status: body.status, amount: body.amount });

        const isValid = payuService.verifyResponseHash(body);
        if (!isValid) {
            logger.warn('PayU callback hash mismatch', { txnid: body.txnid });
            return sendRedirectResponse(res, `${frontendUrl}/billing?payment=hash_failed&txnid=${encodeURIComponent(body.txnid || '')}`);
        }

        if (body.status === 'success') {
            await tenantStore.completePayUPayment(body.txnid, body.mihpayid || body.bank_ref_num || '');
            logger.info('PayU payment completed and user tier upgraded', { txnid: body.txnid });
            return sendRedirectResponse(res, `${frontendUrl}/billing?payment=success&txnid=${encodeURIComponent(body.txnid)}`);
        } else {
            const reason = body.unmappedstatus || body.error_Message || 'declined';
            return sendRedirectResponse(res, `${frontendUrl}/billing?payment=failed&reason=${encodeURIComponent(reason)}`);
        }
    } catch (err: any) {
        logger.error('Error handling PayU callback', { error: String(err) });
        return sendRedirectResponse(res, `${frontendUrl}/billing?payment=error`);
    }
});

