import { Context } from "@/trpc/server/init";
import { Chat } from "@/types/chat";
import { messages as chatMessages } from "@/lib/chat/messages";

const chatSelect =
  "id, title, userId:user_id, status, messages (id, role, chatId:chat_id, content)";

export default class ChatsRepository {
  static async create(ctx: Context, title: string): Promise<Chat> {
    const { supabase, user } = ctx;

    if (!user) {
      throw new Error("Not authenticated");
    }

    const { data: chat, error: chatError } = await supabase
      .from("chats")
      .insert({
        title,
        user_id: user.id,
        status: "initialized",
      })
      .select("id")
      .single();

    if (chatError) {
      throw chatError;
    }

    const { error: messageError } = await supabase.from("messages").insert({
      chat_id: chat.id,
      role: "assistant",
      content: chatMessages.chatInitialized,
    });

    if (messageError) {
      throw messageError;
    }

    const { data, error } = await supabase
      .from("chats")
      .select(chatSelect)
      .eq("id", chat.id)
      .eq("user_id", user.id)
      .single();

    if (error) {
      throw error;
    }

    return data;
  }

  static async findByIdForUser(
    ctx: Context,
    { id, userId }: { id: string; userId: string }
  ): Promise<Chat | null> {
    const { supabase } = ctx;

    const { data, error } = await supabase
      .from("chats")
      .select(chatSelect)
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }
}
