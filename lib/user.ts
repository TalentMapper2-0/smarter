export function getAvatarUrl(name: string) {
  return `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(name)}`;
}
