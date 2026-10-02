import type { Metadata } from "next";
import { ConnectionsPage } from "../connections";

export async function generateMetadata(
  props: PageProps<"/[username]/following">,
): Promise<Metadata> {
  const { username } = await props.params;
  return { title: `People followed by @${username}` };
}

export default async function FollowingPage(props: PageProps<"/[username]/following">) {
  const { username } = await props.params;
  return <ConnectionsPage username={username} direction="following" />;
}
