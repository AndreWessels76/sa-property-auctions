export type DeadLetterItem = {
  id: string;
  reason: string;
  payload: unknown;
  failedAt: string;
};

const deadLetterQueue: DeadLetterItem[] = [];

export function enqueueDeadLetter(item: Omit<DeadLetterItem, "failedAt">) {
  deadLetterQueue.push({
    ...item,
    failedAt: new Date().toISOString(),
  });
}

export function listDeadLetters() {
  return [...deadLetterQueue];
}
