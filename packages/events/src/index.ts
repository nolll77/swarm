import IORedis from "ioredis";
import { DomainEvent, generateId, nowISO } from "@ai-dev/shared";
import { createLogger } from "@ai-dev/logger";

const logger = createLogger("event-bus");

export class EventBus {
  private redis: IORedis;
  private subscribers: Map<string, IORedis>;

  constructor(redisUrl?: string) {
    this.redis = new IORedis(redisUrl || process.env.REDIS_URL || "redis://localhost:6379", {
      maxRetriesPerRequest: null,
    });
    this.subscribers = new Map();
  }

  async publish<T>(topic: string, tenantId: string, payload: T, correlationId?: string): Promise<string> {
    const event: DomainEvent<T> = {
      id: generateId(),
      type: topic,
      tenantId,
      payload,
      timestamp: new Date(),
      correlationId: correlationId || generateId(),
    };

    await this.redis.xadd(
      topic,
      "*",
      "data",
      JSON.stringify(event)
    );

    logger.info("Event published", { topic, eventId: event.id, tenantId });
    return event.id;
  }

  async subscribe(
    topic: string,
    groupName: string,
    consumerName: string,
    handler: (event: DomainEvent) => Promise<void>
  ): Promise<void> {
    const sub = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
      maxRetriesPerRequest: null,
    });
    this.subscribers.set(`${topic}:${groupName}:${consumerName}`, sub);

    // Create consumer group if it does not exist
    try {
      await sub.xgroup("CREATE", topic, groupName, "0", "MKSTREAM");
    } catch (err: any) {
      if (!err.message?.includes("BUSYGROUP")) {
        throw err;
      }
    }

    logger.info("Subscribed to topic", { topic, groupName, consumerName });

    const poll = async () => {
      while (true) {
        try {
          const results = await sub.xreadgroup(
            "GROUP",
            groupName,
            consumerName,
            "COUNT",
            10,
            "BLOCK",
            5000,
            "STREAMS",
            topic,
            ">"
          );

          if (!results) continue;

          for (const [, messages] of results) {
            for (const [messageId, fields] of messages) {
              const dataIndex = fields.indexOf("data");
              if (dataIndex === -1) continue;

              const raw = fields[dataIndex + 1];
              const event: DomainEvent = JSON.parse(raw);

              try {
                await handler(event);
                await sub.xack(topic, groupName, messageId);
              } catch (err) {
                logger.error("Event handler failed", {
                  topic,
                  messageId,
                  error: err instanceof Error ? err.message : String(err),
                });
              }
            }
          }
        } catch (err) {
          logger.error("Event polling error", {
            topic,
            error: err instanceof Error ? err.message : String(err),
          });
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
    };

    poll();
  }

  async disconnect(): Promise<void> {
    await this.redis.quit();
    for (const [, sub] of this.subscribers) {
      await sub.quit();
    }
  }
}

let defaultBus: EventBus | null = null;

export function getEventBus(): EventBus {
  if (!defaultBus) {
    defaultBus = new EventBus();
  }
  return defaultBus;
}

export { DomainEvent };
