"use client";

import { signOut } from "next-auth/react";
import { Button } from "./ui/button";

export function LogoutButton() {
  return <Button onClick={() => signOut({ callbackUrl: "/" })}>Log out</Button>;
}
