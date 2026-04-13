import api from "./axios";

export async function getTopStreakLeaderboard() {
  const response = await api.get("/streak/leaderboard/top5");
  return response.data;
}
