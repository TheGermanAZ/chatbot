import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { MessageSquarePlusIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";

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
      <div className="flex h-screen">
        {/* Sidebar */}
        <aside
          className="flex w-64 flex-col border-r border-sidebar-border bg-sidebar
  text-sidebar-foreground"
        >
          <div className="flex items-center justify-between p-4">
            <h2 className="text-sm font-semibold">Chats</h2>
            <Button variant="default" size="icon" onClick={() => navigate("/")}>
              <MessageSquarePlusIcon className="size-4 " />
            </Button>
          </div>
          <Separator />
          <ScrollArea className="flex-1">
            <div className="flex flex-col gap-1 p-2">
              {chats.map((chat) => (
                <Button
                  key={chat.id}
                  onClick={() => navigate(`/chat/${chat.id}`)}
                  variant="default"
                  className={cn(
                    "rounded-md px-3 py-2 text-left text-sm truncate",
                    "hover:bg-sidebar-accent ",
                    chat.id === activeChatId &&
                      "bg-sidebar-accent  font-medium",
                  )}
                >
                  {chat.title}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </aside>

        {/* Main content - child route renders here */}
        <main className="flex flex-1 flex-col">
          <Outlet context={{ refreshChatList }} />
        </main>
      </div>
    </>
  );
}
