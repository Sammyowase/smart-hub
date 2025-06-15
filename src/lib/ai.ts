import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";

// Initialize Google Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");

interface AIContext {
  userId: string;
  workspaceId: string;
  conversationType: "group" | "direct";
  conversationId?: string;
  groupId?: string;
}

interface TaskSummary {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
}

interface MeetingSummary {
  upcoming: number;
  today: number;
  thisWeek: number;
}

export class AIService {
  private model;

  constructor() {
    this.model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  }

  async generateResponse(
    userMessage: string,
    context: AIContext
  ): Promise<string> {
    try {
      // Parse AI commands
      const command = this.parseCommand(userMessage);

      if (command) {
        return await this.handleCommand(command, context);
      }

      // Get workspace context for general questions
      const workspaceContext = await this.getWorkspaceContext(context);

      // Create system prompt with context
      const systemPrompt = this.createSystemPrompt(workspaceContext);

      // Generate response using Gemini
      const prompt = `${systemPrompt}\n\nUser message: ${userMessage}`;
      const result = await this.model.generateContent(prompt);
      const response = result.response;

      return response.text() || "I'm sorry, I couldn't generate a response. Please try again.";

    } catch (error) {
      console.error("AI Service error:", error);
      return "I'm experiencing some technical difficulties. Please try again later.";
    }
  }

  private parseCommand(message: string): { type: string; params?: string } | null {
    const cleanMessage = message.replace(/@ai/gi, "").trim().toLowerCase();

    if (cleanMessage.startsWith("summarize") || cleanMessage.startsWith("summary")) {
      return { type: "summarize", params: cleanMessage.replace(/^(summarize|summary)\s*/, "") };
    }

    if (cleanMessage.startsWith("schedule")) {
      return { type: "schedule", params: cleanMessage.replace(/^schedule\s*/, "") };
    }

    if (cleanMessage.startsWith("remind")) {
      return { type: "remind", params: cleanMessage.replace(/^remind\s*/, "") };
    }

    if (cleanMessage.startsWith("tasks") || cleanMessage.startsWith("task")) {
      return { type: "tasks", params: cleanMessage.replace(/^tasks?\s*/, "") };
    }

    if (cleanMessage.startsWith("meetings") || cleanMessage.startsWith("meeting")) {
      return { type: "meetings", params: cleanMessage.replace(/^meetings?\s*/, "") };
    }

    return null;
  }

  private async handleCommand(
    command: { type: string; params?: string },
    context: AIContext
  ): Promise<string> {
    switch (command.type) {
      case "summarize":
        return await this.handleSummarize(command.params || "", context);

      case "schedule":
        return await this.handleSchedule(command.params || "", context);

      case "remind":
        return await this.handleRemind(command.params || "", context);

      case "tasks":
        return await this.handleTasks(command.params || "", context);

      case "meetings":
        return await this.handleMeetings(command.params || "", context);

      default:
        return "I didn't understand that command. Try: summarize, schedule, remind, tasks, or meetings.";
    }
  }

  private async handleSummarize(params: string, context: AIContext): Promise<string> {
    try {
      const tasks = await this.getTaskSummary(context);
      const meetings = await this.getMeetingSummary(context);

      const prompt = `Create a brief productivity summary based on this data:

Tasks: ${tasks.total} total (${tasks.pending} pending, ${tasks.inProgress} in progress, ${tasks.completed} completed, ${tasks.overdue} overdue)
Meetings: ${meetings.upcoming} upcoming, ${meetings.today} today, ${meetings.thisWeek} this week

Additional context: ${params}

Provide actionable insights and recommendations in a friendly, helpful tone.`;

      const result = await this.model.generateContent(prompt);
      return result.response.text() || "Unable to generate summary.";

    } catch (error) {
      console.error("Summarize error:", error);
      return "I couldn't generate a summary right now. Please try again.";
    }
  }

  private async handleSchedule(params: string, context: AIContext): Promise<string> {
    if (!params) {
      return "Please specify what you'd like to schedule. For example: '@ai schedule team meeting tomorrow at 2pm'";
    }

    const prompt = `Help the user schedule something based on their request: "${params}"

Provide:
1. Suggested meeting details (title, time, duration)
2. Steps to create the meeting in the system
3. Any recommendations for preparation

Be helpful and specific.`;

    try {
      const result = await this.model.generateContent(prompt);
      return result.response.text() || "I couldn't help with scheduling right now.";
    } catch (error) {
      console.error("Schedule error:", error);
      return "I'm having trouble with scheduling assistance. Please try again.";
    }
  }

  private async handleRemind(params: string, context: AIContext): Promise<string> {
    if (!params) {
      return "Please specify what you'd like to be reminded about. For example: '@ai remind me to review the project proposal tomorrow'";
    }

    // For now, provide guidance on setting reminders
    // In a full implementation, this would create actual reminders
    return `I'd be happy to help you set up a reminder for: "${params}"

Here are some ways to set reminders in SmartHub:
1. Create a task with a due date
2. Schedule a meeting with yourself
3. Add it to your notes with a date

Would you like me to help you create a task for this reminder?`;
  }

  private async handleTasks(params: string, context: AIContext): Promise<string> {
    try {
      const taskSummary = await this.getTaskSummary(context);

      let response = `📋 **Your Tasks Overview:**\n\n`;
      response += `• Total: ${taskSummary.total} tasks\n`;
      response += `• Pending: ${taskSummary.pending}\n`;
      response += `• In Progress: ${taskSummary.inProgress}\n`;
      response += `• Completed: ${taskSummary.completed}\n`;

      if (taskSummary.overdue > 0) {
        response += `• ⚠️ Overdue: ${taskSummary.overdue}\n`;
      }

      if (params.includes("overdue") && taskSummary.overdue > 0) {
        response += `\n🚨 You have ${taskSummary.overdue} overdue tasks that need attention!`;
      } else if (params.includes("today")) {
        response += `\n💡 Focus on completing your in-progress tasks today.`;
      }

      return response;

    } catch (error) {
      console.error("Tasks error:", error);
      return "I couldn't retrieve your task information right now.";
    }
  }

  private async handleMeetings(params: string, context: AIContext): Promise<string> {
    try {
      const meetingSummary = await this.getMeetingSummary(context);

      let response = `📅 **Your Meetings Overview:**\n\n`;
      response += `• Upcoming: ${meetingSummary.upcoming} meetings\n`;
      response += `• Today: ${meetingSummary.today}\n`;
      response += `• This week: ${meetingSummary.thisWeek}\n`;

      if (params.includes("today") && meetingSummary.today > 0) {
        response += `\n📍 You have ${meetingSummary.today} meeting(s) scheduled for today. Make sure you're prepared!`;
      } else if (meetingSummary.upcoming === 0) {
        response += `\n✨ Your calendar is clear! Good time to focus on tasks.`;
      }

      return response;

    } catch (error) {
      console.error("Meetings error:", error);
      return "I couldn't retrieve your meeting information right now.";
    }
  }

  private async getWorkspaceContext(context: AIContext) {
    try {
      const [taskSummary, meetingSummary] = await Promise.all([
        this.getTaskSummary(context),
        this.getMeetingSummary(context)
      ]);

      return {
        tasks: taskSummary,
        meetings: meetingSummary,
        userId: context.userId,
        workspaceId: context.workspaceId
      };
    } catch (error) {
      console.error("Error getting workspace context:", error);
      return null;
    }
  }

  private async getTaskSummary(context: AIContext): Promise<TaskSummary> {
    const now = new Date();

    const [total, pending, inProgress, completed, overdue] = await Promise.all([
      prisma.task.count({ where: { assigneeId: context.userId } }),
      prisma.task.count({ where: { assigneeId: context.userId, status: "TODO" } }),
      prisma.task.count({ where: { assigneeId: context.userId, status: "IN_PROGRESS" } }),
      prisma.task.count({ where: { assigneeId: context.userId, status: "DONE" } }),
      prisma.task.count({
        where: {
          assigneeId: context.userId,
          status: { not: "DONE" },
          dueDate: { lt: now }
        }
      })
    ]);

    return { total, pending, inProgress, completed, overdue };
  }

  private async getMeetingSummary(context: AIContext): Promise<MeetingSummary> {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const [upcoming, todayCount, thisWeekCount] = await Promise.all([
      prisma.meeting.count({
        where: {
          workspaceId: context.workspaceId,
          startTime: { gte: now },
          participants: { some: { userId: context.userId } }
        }
      }),
      prisma.meeting.count({
        where: {
          workspaceId: context.workspaceId,
          startTime: { gte: today, lt: tomorrow },
          participants: { some: { userId: context.userId } }
        }
      }),
      prisma.meeting.count({
        where: {
          workspaceId: context.workspaceId,
          startTime: { gte: today, lt: weekEnd },
          participants: { some: { userId: context.userId } }
        }
      })
    ]);

    return { upcoming, today: todayCount, thisWeek: thisWeekCount };
  }

  private createSystemPrompt(workspaceContext: any): string {
    return `You are SmartHub AI Assistant, a helpful productivity assistant for a team workspace management platform.

Context about the user's workspace:
- Tasks: ${workspaceContext?.tasks?.total || 0} total, ${workspaceContext?.tasks?.pending || 0} pending, ${workspaceContext?.tasks?.overdue || 0} overdue
- Meetings: ${workspaceContext?.meetings?.upcoming || 0} upcoming, ${workspaceContext?.meetings?.today || 0} today

Your role:
- Help with productivity, task management, and scheduling
- Provide actionable insights and suggestions
- Be concise but helpful
- Use a friendly, professional tone
- Focus on workspace-related topics

Available commands:
- @ai summarize - Provide productivity summary
- @ai schedule [details] - Help with scheduling
- @ai remind [details] - Help set reminders
- @ai tasks - Show task overview
- @ai meetings - Show meeting overview

Respond helpfully to questions about productivity, time management, and workspace organization.`;
  }
}

// Export singleton instance
export const aiService = new AIService();
