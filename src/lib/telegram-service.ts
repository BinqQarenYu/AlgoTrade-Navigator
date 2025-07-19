

'use server';

interface SendTelegramMessageParams {
    botToken: string;
    chatId: string;
    message: string;
}

/**
 * Sends a message to a specific Telegram chat using a bot token.
 * @param {SendTelegramMessageParams} params - The parameters for sending the message.
 * @returns {Promise<void>}
 * @throws An error if the message fails to send.
 */
export const sendTelegramMessage = async ({ botToken, chatId, message }: SendTelegramMessageParams): Promise<void> => {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'Markdown', // Use Markdown for better formatting
            }),
        });

        const data = await response.json();

        if (!data.ok) {
            console.error('Telegram API Error:', data.description);
            throw new Error(`Failed to send Telegram message: ${data.description}`);
        }

        console.log('Successfully sent Telegram message.');

    } catch (error: any) {
        console.error('Error sending Telegram message:', error);
        // Re-throw a more user-friendly error
        throw new Error('Could not send Telegram notification. Please check your Bot Token and Chat ID in Settings.');
    }
};
