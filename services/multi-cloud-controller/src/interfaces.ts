export interface ServiceDeployment {
  serviceId: string;
  image: string;
  cpu: number;
  memory: number;
  replicas: number;
}

export interface ICloudProvider {
  /**
   * Provisions a compute resource (e.g., ECS Task, Cloud Run Service)
   */
  provisionCompute(deployment: ServiceDeployment): Promise<{ instanceId: string, endpoint: string }>;
  
  /**
   * Provisions a storage bucket
   */
  provisionStorage(bucketName: string): Promise<{ bucketUrl: string }>;
  
  /**
   * Retrieves the provider name for logging
   */
  getProviderName(): string;
}
