export type Versioned = {
  readonly id: string;
  readonly version: number;
  readonly versionNonce: number;
  readonly isDeleted?: boolean;
};

/**
 * 요소 병합 규칙(s19 D19-5, Excalidraw reconcileElements 와 같다): version 이 큰 쪽이 이기고,
 * 같으면 versionNonce 가 작은 쪽이 이긴다. 완전히 같으면 들어온 것을 버린다.
 */
export function remoteWins(local: Versioned | undefined, remote: Versioned) {
  if (!local) return true;
  if (remote.version !== local.version) return remote.version > local.version;
  return remote.versionNonce < local.versionNonce;
}

const keyOf = (element: Versioned) =>
  `${element.version}:${element.versionNonce}`;

/**
 * 서버(방)가 가진 것으로 아는 요소 version. 바뀐 요소만 보내고(delta), 받은 요소를 되돌려 보내지 않는다(에코 방지).
 * 받은 요소와 보낸 요소를 모두 적어 두면, 화면에서 그와 다른 요소만 내 변경이다.
 * 서버가 거부한 묶음(error, 1009)은 소켓으로 다시 보내지 않고, 화면에 남아 있는 동안 저장 안 된 변경으로 센다.
 */
export function createSyncTracker() {
  const known = new Map<string, string>();
  const rejected = new Map<string, string>();
  let lastSent: readonly Versioned[] = [];
  const isRejected = (element: Versioned) =>
    rejected.get(element.id) === keyOf(element);
  const isKnown = (element: Versioned) =>
    known.get(element.id) === keyOf(element);
  return {
    /** joined·scene: 서버 상태로 통째로 바꾼다. 거부 기록은 남긴다(다시 붙어도 같은 것을 보내지 않게). */
    reset(elements: readonly Versioned[]) {
      known.clear();
      lastSent = [];
      for (const element of elements) known.set(element.id, keyOf(element));
    },
    /** 받은 요소를 적는다. */
    mark(elements: readonly Versioned[]) {
      for (const element of elements) known.set(element.id, keyOf(element));
    },
    /** 보낸 요소를 적는다. 바로 뒤 거부되면 reject 가 이 묶음을 되돌린다. */
    sent(elements: readonly Versioned[]) {
      for (const element of elements) known.set(element.id, keyOf(element));
      lastSent = elements;
    },
    /** 마지막으로 보낸 묶음을 서버가 받지 않았다. 거부한 요소 수를 돌려준다. */
    reject() {
      for (const element of lastSent) {
        rejected.set(element.id, keyOf(element));
        known.delete(element.id);
      }
      const count = lastSent.length;
      lastSent = [];
      return count;
    },
    /** 서버가 아직 모르는 내 변경. 서버가 본 적 없는 지운 요소, 거부된 요소는 보내지 않는다. */
    delta<T extends Versioned>(elements: readonly T[]): T[] {
      return elements.filter((element) => {
        if (isRejected(element)) return false;
        const seen = known.get(element.id);
        if (seen === undefined) return !element.isDeleted;
        return seen !== keyOf(element);
      });
    },
    /** 저장 안 된 내 변경이 있나. 보낼 것 + 거부돼 화면에만 남은 것. */
    pending(elements: readonly Versioned[]) {
      return (
        this.delta(elements).length > 0 ||
        elements.some((element) => isRejected(element) && !isKnown(element))
      );
    },
  };
}

export type SyncTracker = ReturnType<typeof createSyncTracker>;
