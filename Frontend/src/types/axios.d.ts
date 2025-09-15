import 'axios';

declare module 'axios' {
    interface InternalAxiosRequestConfig<D = any> {
        _retry?: boolean;
    }
}