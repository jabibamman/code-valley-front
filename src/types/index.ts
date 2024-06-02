export interface ExecuteCodeRequest {
    language: string;
    code: string;
}

export interface ExecuteCodeResponse {
    output: string;
    error?: string;
}

export * from './User';
export * from './Post';
