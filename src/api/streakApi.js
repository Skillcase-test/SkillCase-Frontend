import api from "./axios";

export async function getStreakData() {
  const response = await api.cachedGet("/streak", {}, "SHORT_PRIVATE");
  return response.data;
}

export async function getTopStreakLeaderboard() {
  const response = await api.cachedGet(
    "/streak/leaderboard/top5",
    {},
    "SHORT_PRIVATE",
  );
  return response.data;
}
