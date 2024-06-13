export function matchDynamicUrl(path: string, index?: number) {
  const regex = /(\/\w+\/)*(\d+)$/;
  const match = path.match(regex);
  if (match) {
    const pathname = match[1].slice(0, -1);
    const id = match[2];
    return `${pathname}/${index || id}`;
  } else {
    return `${path.replace(/\/*$/, "")}/${index}`;
  }
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
