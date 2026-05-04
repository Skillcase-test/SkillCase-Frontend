import api from "./axios";

export async function getTopStreakLeaderboard() {
  const response = await api.cachedGet(
    "/streak/leaderboard/top5",
    {},
    "SHORT_PRIVATE",
  );
  return response.data;
}
