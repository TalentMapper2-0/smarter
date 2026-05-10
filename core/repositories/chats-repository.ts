import { Context } from "@/trpc/server/init";
import { CandidateCreate } from "@/types/candidate";
import {
  Chat,
  ChatMessage,
  ChatMessageRole,
  ChatMessageType,
  ChatStatus,
} from "@/types/chat";
import {
  DbMessageRow,
  mapChatMessageToDbInsert,
  mapDbMessageToChatMessage,
} from "@/lib/chat/message-mappers";

const messageSelect = "id, chat_id, role, type, content, created_at, meta_data";
const chatSelect = `id, title, userId:user_id, status, createdAt:created_at, messages (${messageSelect})`;

type DbChatRow = Omit<Chat, "messages"> & {
  messages: DbMessageRow[] | null;
};

function mapDbChatToChat(row: DbChatRow): Chat {
  return {
    ...row,
    messages: (row.messages ?? []).map(mapDbMessageToChatMessage),
  };
}

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

    await ChatsRepository.addMessage(ctx, {
      chatId: chat.id,
      userId: user.id,
      content: title,
      role: ChatMessageRole.User,
    });

    const { data, error } = await supabase
      .from("chats")
      .select(chatSelect)
      .eq("id", chat.id)
      .eq("user_id", user.id)
      .order("created_at", { referencedTable: "messages", ascending: true })
      .single();

    if (error) {
      throw error;
    }

    return mapDbChatToChat(data as DbChatRow);
  }

  static async createMessageAndUpdateStatus(
    ctx: Context,
    {
      chatId,
      userId,
      content,
      role,
      type = ChatMessageType.Text,
      metadata = {},
      nextStatus,
    }: {
      chatId: string;
      userId: string;
      content: string;
      role: ChatMessageRole;
      type?: ChatMessageType;
      metadata?: Record<string, unknown>;
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

    const { data: message, error: messageError } = await supabase
      .from("messages")
      .insert(
        mapChatMessageToDbInsert({
          chatId,
          role,
          type,
          content,
          metadata,
        })
      )
      .select(messageSelect)
      .single();

    if (messageError) {
      throw messageError;
    }

    return mapDbMessageToChatMessage(message as DbMessageRow);
  }

  static async addMessage(
    ctx: Context,
    {
      chatId,
      userId,
      content,
      role,
      type = ChatMessageType.Text,
      metadata = {},
    }: {
      chatId: string;
      userId: string;
      content: string | null;
      role: ChatMessageRole;
      type?: ChatMessageType;
      metadata?: Record<string, unknown>;
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
      .insert(
        mapChatMessageToDbInsert({
          chatId,
          role,
          type,
          content,
          metadata,
        })
      )
      .select(messageSelect)
      .single();

    if (messageError) {
      throw messageError;
    }

    return mapDbMessageToChatMessage(message as DbMessageRow);
  }

  static async updateMessageMetadata(
    ctx: Context,
    {
      chatId,
      userId,
      messageId,
      type,
      metadata,
    }: {
      chatId: string;
      userId: string;
      messageId: string;
      type: ChatMessageType;
      metadata: Record<string, unknown>;
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

    const { data: message, error } = await supabase
      .from("messages")
      .update({
        meta_data: metadata,
      })
      .eq("id", messageId)
      .eq("chat_id", chatId)
      .eq("type", type)
      .select(messageSelect)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return message ? mapDbMessageToChatMessage(message as DbMessageRow) : null;
  }

  static async updateLatestMessageMetadataByType(
    ctx: Context,
    {
      chatId,
      userId,
      type,
      metadata,
    }: {
      chatId: string;
      userId: string;
      type: ChatMessageType;
      metadata: Record<string, unknown>;
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

    const { data: messages, error: findError } = await supabase
      .from("messages")
      .select(messageSelect)
      .eq("chat_id", chatId)
      .eq("type", type)
      .order("created_at", { ascending: false })
      .limit(1);

    if (findError) {
      throw findError;
    }

    const message = messages?.[0] as DbMessageRow | undefined;

    if (!message) {
      return null;
    }

    return ChatsRepository.updateMessageMetadata(ctx, {
      chatId,
      userId,
      messageId: message.id,
      type,
      metadata,
    });
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
      chat_id: chatId,
      linkedin_url: row.linkedinUrl,
      sales_navigator_id: row.salesNavigatorId ?? null,
      name: [row.firstName, row.lastName].filter(Boolean).join(" ").trim(),
    }));

    const { error } = await supabase.from("classify_candidates").insert(rows);

    if (error) {
      throw error;
    }
  }

  static async saveVacancy(
    ctx: Context,
    {
      chatId,
      vacancyText,
    }: {
      chatId: string;
      vacancyText: string;
    }
  ) {
    const { supabase } = ctx;

    const { error: deleteError } = await supabase
      .from("classify_vacancies")
      .delete()
      .eq("chat_id", chatId);

    if (deleteError) {
      throw deleteError;
    }

    const { error } = await supabase.from("classify_vacancies").insert({
      chat_id: chatId,
      vacancy_text: vacancyText,
    });

    if (error) {
      throw error;
    }
  }

  static async saveComment(
    ctx: Context,
    {
      chatId,
      commentText,
    }: {
      chatId: string;
      commentText: string;
    }
  ) {
    const { supabase } = ctx;

    const { error: deleteError } = await supabase
      .from("classify_comments")
      .delete()
      .eq("chat_id", chatId);

    if (deleteError) {
      throw deleteError;
    }

    const { error } = await supabase.from("classify_comments").insert({
      chat_id: chatId,
      comment_text: commentText,
    });

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
      .order("created_at", { referencedTable: "messages", ascending: true })
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? mapDbChatToChat(data as DbChatRow) : null;
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
      .order("created_at", { referencedTable: "messages", ascending: true })
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? mapDbChatToChat(data as DbChatRow) : null;
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
      .order("created_at", { referencedTable: "messages", ascending: true })
      .limit(20);

    if (error) {
      throw error;
    }

    return (data ?? []).map((chat) => mapDbChatToChat(chat as DbChatRow));
  }
}
