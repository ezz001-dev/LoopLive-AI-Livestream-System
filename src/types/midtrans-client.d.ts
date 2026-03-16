declare module 'midtrans-client' {
    export class Snap {
        constructor(options: {
            isProduction: boolean;
            serverKey: string;
            clientKey: string;
        });
        createTransaction(parameter: any): Promise<any>;
    }

    export class CoreApi {
        constructor(options: {
            isProduction: boolean;
            serverKey: string;
            clientKey: string;
        });
        transaction: {
            notification(notificationBody: any): Promise<any>;
            status(transactionId: string): Promise<any>;
            verify(transactionId: string): Promise<any>;
        };
    }
}
