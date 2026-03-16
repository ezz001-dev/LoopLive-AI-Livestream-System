declare module 'midtrans-client' {
    export class MidtransClient {
        static Snap: any;
        static CoreApi: any;
    }
    
    export namespace MidtransClient {
        class Snap {
            constructor(options: {
                isProduction: boolean;
                serverKey: string;
                clientKey: string;
            });
            createTransaction(parameter: any): Promise<any>;
        }

        class CoreApi {
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
}
