import type { Metadata } from "next";
import { ConnectionsPage } from "../connections";

export async function generateMetadata(
  props: PageProps<"/[username]/followers">,
): Promise<Metadata> {
  const { username } = await props.params;
  return { title: `People following @${username}` };
}

export default async function FollowersPage(props: PageProps<"/[username]/followers">) {
  const { username } = await props.params;
  return <ConnectionsPage username={username} direction="followers" />;
}
