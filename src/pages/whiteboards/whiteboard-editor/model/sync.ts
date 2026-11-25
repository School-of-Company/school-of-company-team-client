type Versioned = {
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

/**
 * 서버(방)가 가진 것으로 아는 요소 version. 바뀐 요소만 보내고(delta), 받은 요소를 되돌려 보내지 않는다(에코 방지).
 * 받은 요소와 보낸 요소를 모두 적어 두면, 화면에서 그와 다른 요소만 내 변경이다.
 */
export function createSyncTracker() {
  const known = new Map<string, string>();
  const key = (element: Versioned) =>
    `${element.version}:${element.versionNonce}`;
  return {
    /** joined·scene: 서버 상태로 통째로 바꾼다. */
    reset(elements: readonly Versioned[]) {
      known.clear();
      for (const element of elements) known.set(element.id, key(element));
    },
    /** 받은 요소, 보낸 요소를 적는다. */
    mark(elements: readonly Versioned[]) {
      for (const element of elements) known.set(element.id, key(element));
    },
    /** 서버가 아직 모르는 내 변경. 서버가 본 적 없는 지운 요소는 보내지 않는다. */
    delta<T extends Versioned>(elements: readonly T[]): T[] {
      return elements.filter((element) => {
        const seen = known.get(element.id);
        if (seen === undefined) return !element.isDeleted;
        return seen !== key(element);
      });
    },
  };
}
