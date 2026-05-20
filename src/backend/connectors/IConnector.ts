export interface IConnectorConfig {
  host: string;
  port: number;
  username?: string;
  password?: string;
  database?: string;
  [key: string]: any;
}

export interface IConnector {
  connect(config: IConnectorConfig): Promise<boolean>;
  disconnect(): Promise<void>;
  read(pathOrQuery: string): Promise<any[]>;
  write(pathOrCollection: string, data: any[]): Promise<boolean>;
  getMetadata(): any;
}
