export function matchDynamicUrl(path: string) {
  const regex = /(\/\w+\/)*(\d+)$/;
  const match = path.match(regex);
  if (match) {
    const pathname = match[1].slice(0, -1);
    const id = match[2];
    return {
      path: pathname,
      id,
    }
  } else {
    return { path: path.replace(/\/*$/, ""), id: ''};
  }
}
