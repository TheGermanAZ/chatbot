import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { BrainCircuitIcon, LogOutIcon, MessageSquarePlusIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { authClient } from "@/lib/auth-client";

type ChatSummary = { id: string; title: string };

export default function Layout() {
  const [chats, setChats] = useState<ChatSummary[]>([]);
  const navigate = useNavigate();
  const location = useLocation();

  const activeChatId = location.pathname.startsWith("/chat/")
    ? location.pathname.split("/chat/")[1]
    : null;

  const refreshChatList = useCallback(async () => {
    const res = await fetch("/chats");
    if (res.ok) setChats(await res.json());
  }, []);

  useEffect(() => {
    refreshChatList();
  }, [refreshChatList]);
  return (
    <>
      <div className="flex h-screen min-w-0 overflow-hidden">
        {/* Sidebar */}
        <aside
          className="flex w-64 max-w-64 shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-lg"
        >
          <div className="flex items-center justify-between p-4 pb-3">
            <h2 className="text-sm font-semibold text-sidebar-foreground/90">Chats</h2>
            <Button
              variant="default"
              size="icon"
              onClick={() => navigate("/new")}
            >
              <MessageSquarePlusIcon className="size-4 " />
            </Button>
          </div>
          <Separator />
          <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
            <div className="flex min-w-0 flex-col gap-0.5 p-2">
              {chats.map((chat) => (
                <Button
                  key={chat.id}
                  onClick={() => navigate(`/chat/${chat.id}`)}
                  variant="ghost"
                  className={cn(
                    "w-full max-w-full overflow-hidden rounded-md px-3 py-2 text-left text-sm",
                    "hover:bg-sidebar-accent",
                    chat.id === activeChatId &&
                      "bg-sidebar-accent font-medium",
                  )}
                >
                  <span className="block truncate">{chat.title}</span>
                </Button>
              ))}
            </div>
          </div>
          <Separator className="opacity-50" />
          <div className="flex flex-col gap-2 p-4 pt-3">
            <Button
              variant={location.pathname === "/rllm" ? "default" : "secondary"}
              className="w-full justify-start gap-2"
              onClick={() => navigate("/rllm")}
            >
              <BrainCircuitIcon className="size-4" />
              RLLM Demo
            </Button>
            <Button
              variant="secondary"
              className="w-full justify-start gap-2"
              onClick={async () => {
                await authClient.signOut();
                navigate("/");
              }}
            >
              <LogOutIcon className="size-4" />
              Sign out
            </Button>
          </div>
        </aside>

        {/* Main content - child route renders here */}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
          <Outlet context={{ refreshChatList }} />
        </main>
      </div>
    </>
  );
}
