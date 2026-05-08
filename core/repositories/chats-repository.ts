import { Context } from "@/trpc/server/init";
import { CandidateCreate } from "@/types/candidate";
import { Chat, ChatMessage, ChatMessageRole, ChatStatus } from "@/types/chat";

const chatSelect =
  "id, title, userId:user_id, status, createdAt:created_at, messages (id, role, chatId:chat_id, content, files:message_files (id, messageId:message_id, name, size))";

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
        status: ChatStatus.Initialized,
      })
      .select("id")
      .single();

    if (chatError) {
      throw chatError;
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

  static async createMessageIfEmptyAndUpdateStatus(
    ctx: Context,
    {
      chatId,
      userId,
      content,
      role,
      nextStatus,
    }: {
      chatId: string;
      userId: string;
      content: string;
      role: ChatMessageRole;
      nextStatus?: ChatStatus;
    }
  ): Promise<ChatMessage | null> {
    const { supabase } = ctx;

    const { data: chat, error: chatError } = await supabase
      .from("chats")
      .select("id")
      .eq("id", chatId)
      .eq("user_id", userId)
      .maybeSingle();

    if (chatError) {
      throw chatError;
    }

    if (!chat) {
      return null;
    }

    const { data: existingMessage, error: existingMessageError } =
      await supabase
        .from("messages")
        .select("id, role, chatId:chat_id, content")
        .eq("chat_id", chatId)
        .limit(1)
        .maybeSingle();

    if (existingMessageError) {
      throw existingMessageError;
    }

    if (existingMessage) {
      return existingMessage;
    }

    const { data: message, error: messageError } = await supabase
      .from("messages")
      .insert({
        chat_id: chatId,
        role,
        content,
      })
      .select("id, role, chatId:chat_id, content")
      .single();

    if (messageError) {
      throw messageError;
    }

    if (nextStatus) {
      const { error: statusError } = await supabase
        .from("chats")
        .update({
          status: nextStatus,
        })
        .eq("id", chatId)
        .eq("user_id", userId);

      if (statusError) {
        throw statusError;
      }
    }

    return message;
  }

  static async addMessage(
    ctx: Context,
    {
      chatId,
      userId,
      content,
      role,
      file,
    }: {
      chatId: string;
      userId: string;
      content: string | null;
      role: ChatMessageRole;
      file?: {
        name: string;
        size: number;
      };
    }
  ): Promise<ChatMessage> {
    const { supabase } = ctx;

    const { data: chat, error: chatError } = await supabase
      .from("chats")
      .select("id")
      .eq("id", chatId)
      .eq("user_id", userId)
      .maybeSingle();

    if (chatError) {
      throw chatError;
    }

    if (!chat) {
      throw new Error("Chat not found");
    }

    const { data: message, error: messageError } = await supabase
      .from("messages")
      .insert({
        chat_id: chatId,
        role,
        content,
      })
      .select("id, role, chatId:chat_id, content")
      .single();

    if (messageError) {
      throw messageError;
    }

    if (file) {
      const { error: fileError } = await supabase.from("message_files").insert({
        message_id: message.id,
        name: file.name,
        size: file.size,
      });

      if (fileError) {
        throw fileError;
      }
      
      return {
        ...message,
        files: [{ id: "temp", messageId: message.id, name: file.name, size: file.size }],
      };
    }

    return message;
  }

  static async saveChatCandidates(
    ctx: Context,
    {
      chatId,
      candidates,
    }: {
      chatId: string;
      userId: string;
      candidates: CandidateCreate[];
    }
  ) {
    const { supabase } = ctx;

    const rows = candidates.map((row) => ({
      workspace_id: chatId,
      linkedin_url: row.linkedinUrl,
      sales_navigator_id: row.salesNavigatorId ?? null,
      name: [row.firstName, row.lastName].filter(Boolean).join(" ").trim(),
    }));

    const { error } = await supabase.from("classify_candidates").insert(rows);

    if (error) {
      throw error;
    }
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

  static async updateStatusForUser(
    ctx: Context,
    {
      id,
      userId,
      status,
    }: {
      id: string;
      userId: string;
      status: ChatStatus;
    }
  ): Promise<Chat | null> {
    const { supabase } = ctx;

    const { data, error } = await supabase
      .from("chats")
      .update({
        status,
      })
      .eq("id", id)
      .eq("user_id", userId)
      .select(chatSelect)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }

  static async listRecentForUser(
    ctx: Context,
    { userId }: { userId: string }
  ): Promise<Chat[]> {
    const { supabase } = ctx;
    
    const { data, error } = await supabase
      .from("chats")
      .select(chatSelect)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      throw error;
    }
    
    return data;
  }
}
