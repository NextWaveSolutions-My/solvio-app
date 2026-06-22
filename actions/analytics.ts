"use server";

import { requirePermissionOrThrow } from "@/lib/auth-utils";
import { getCollection } from "@/lib/db";
import type { ApiResponse } from "@/types";
import { startOfDay, subDays, format } from "date-fns";

// =============================================================================
// ANALYTICS TYPES
// =============================================================================

export interface TicketTrendData {
  date: string;
  created: number;
  resolved: number;
  open: number;
}

export interface CategoryDistribution {
  category: string;
  count: number;
  percentage: number;
}

export interface PriorityDistribution {
  priority: string;
  count: number;
  percentage: number;
}

export interface StatusDistribution {
  status: string;
  count: number;
  percentage: number;
}

export interface ResponseTimeData {
  averageResponseTime: number; // in hours
  medianResponseTime: number; // in hours
  fastestResponse: number; // in hours
  slowestResponse: number; // in hours
}

export interface ResolutionTimeData {
  averageResolutionTime: number; // in hours
  medianResolutionTime: number; // in hours
  fastestResolution: number; // in hours
  slowestResolution: number; // in hours
}

export interface SupportPerformance {
  userId: string;
  name: string;
  email: string;
  image?: string | null;
  assignedTickets: number;
  resolvedTickets: number;
  averageResolutionTime: number; // in hours
  resolutionRate: number; // percentage
}

export interface AnalyticsData {
  ticketTrends: TicketTrendData[];
  categoryDistribution: CategoryDistribution[];
  priorityDistribution: PriorityDistribution[];
  statusDistribution: StatusDistribution[];
  responseTime: ResponseTimeData;
  resolutionTime: ResolutionTimeData;
  supportPerformance: SupportPerformance[];
  totalTickets: number;
  totalResolved: number;
  totalOpen: number;
  resolutionRate: number; // percentage
}

// =============================================================================
// ANALYTICS FUNCTIONS
// =============================================================================

/**
 * Get comprehensive analytics data
 */
export async function getAnalyticsData(
  days: number = 30
): Promise<ApiResponse<AnalyticsData>> {
  try {
    await requirePermissionOrThrow("analytics.view", { message: "Forbidden" });

    const ticketsCollection = await getCollection("tickets");
    const usersCollection = await getCollection("user");
    const historyCollection = await getCollection("ticket_history");

    // Calculate date range
    const endDate = new Date();
    const startDate = subDays(endDate, days);

    // Get all tickets
    const allTickets = await ticketsCollection.find({}).toArray();
    const totalTickets = allTickets.length;

    // Get tickets in date range
    const recentTickets = await ticketsCollection
      .find({
        createdAt: { $gte: startDate },
      })
      .toArray();

    // Calculate ticket trends (last N days) - Fully optimized
    const ticketTrends: TicketTrendData[] = [];

    // Pre-calculate all dates
    const dateRanges = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(endDate, i);
      const dateStart = startOfDay(date);
      const dateEnd = new Date(dateStart);
      dateEnd.setHours(23, 59, 59, 999);
      dateRanges.push({ date, dateStart, dateEnd });
    }

    // Get created tickets grouped by date
    const createdByDate = await ticketsCollection
      .aggregate([
        {
          $match: {
            createdAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    // Get resolved tickets grouped by date
    const resolvedByDate = await ticketsCollection
      .aggregate([
        {
          $match: {
            resolvedAt: { $gte: startDate },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$resolvedAt" },
            },
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    // Create lookup maps
    const createdMap = new Map<string, number>(
      (createdByDate as Array<{ _id: string; count: number }>).map((item) => [
        item._id,
        item.count,
      ])
    );
    const resolvedMap = new Map<string, number>(
      (resolvedByDate as Array<{ _id: string; count: number }>).map((item) => [
        item._id,
        item.count,
      ])
    );

    // Calculate open tickets using cumulative approach (much faster)
    // Get current open tickets count
    const currentOpenCount = await ticketsCollection.countDocuments({
      status: { $in: ["open", "in_progress", "waiting_on_customer"] },
    });

    // Build trends data - calculate open tickets by working backwards from current count
    let runningOpenCount = currentOpenCount;

    for (let i = dateRanges.length - 1; i >= 0; i--) {
      const { date } = dateRanges[i];
      const dateKey = format(date, "yyyy-MM-dd");

      const created = createdMap.get(dateKey) || 0;
      const resolved = resolvedMap.get(dateKey) || 0;

      // For the last day, use current count
      // For previous days, subtract created and add resolved to go back in time
      const open =
        i === dateRanges.length - 1 ? currentOpenCount : runningOpenCount;

      ticketTrends.unshift({
        date: format(date, "MMM dd"),
        created,
        resolved,
        open,
      });

      // Update running count for previous day (going backwards)
      if (i > 0) {
        runningOpenCount = runningOpenCount - created + resolved;
      }
    }

    // Calculate category distribution
    const categoryGroups = await ticketsCollection
      .aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }])
      .toArray();

    const categoryDistribution: CategoryDistribution[] = (
      categoryGroups as Array<{
        _id: string;
        count: number;
      }>
    ).map((group) => ({
      category: group._id || "unknown",
      count: group.count,
      percentage: Math.round((group.count / totalTickets) * 100),
    }));

    // Calculate priority distribution
    const priorityGroups = await ticketsCollection
      .aggregate([{ $group: { _id: "$priority", count: { $sum: 1 } } }])
      .toArray();

    const priorityDistribution: PriorityDistribution[] = (
      priorityGroups as Array<{
        _id: string;
        count: number;
      }>
    ).map((group) => ({
      priority: group._id || "unknown",
      count: group.count,
      percentage: Math.round((group.count / totalTickets) * 100),
    }));

    // Calculate status distribution
    const statusGroups = await ticketsCollection
      .aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }])
      .toArray();

    const statusDistribution: StatusDistribution[] = (
      statusGroups as Array<{
        _id: string;
        count: number;
      }>
    ).map((group) => ({
      status: group._id || "unknown",
      count: group.count,
      percentage: Math.round((group.count / totalTickets) * 100),
    }));

    // Calculate response time (time from ticket creation to first comment by support)
    // Optimized: Get all first responses in one aggregation query
    const ticketIds = recentTickets.map((t: { _id: { toString(): string } }) =>
      t._id.toString()
    );

    const firstResponses = await historyCollection
      .aggregate([
        {
          $match: {
            ticketId: { $in: ticketIds },
            action: "comment_added",
          },
        },
        {
          $sort: { createdAt: 1 },
        },
        {
          $group: {
            _id: "$ticketId",
            firstResponseDate: { $first: "$createdAt" },
            userId: { $first: "$userId" },
          },
        },
      ])
      .toArray();

    // Create a map of ticket creation times
    const ticketCreationMap = new Map<string, Date>(
      (
        recentTickets as unknown as Array<{
          _id: { toString(): string };
          createdAt: Date;
        }>
      ).map((t) => [t._id.toString(), t.createdAt])
    );

    // Create a map of customer IDs
    const ticketCustomerMap = new Map<string, string>(
      (
        recentTickets as unknown as Array<{
          _id: { toString(): string };
          customerId: string;
        }>
      ).map((t) => [t._id.toString(), t.customerId])
    );

    const responseTimes: number[] = [];
    for (const response of firstResponses) {
      // Skip if the first comment was by the customer themselves
      if (response.userId === ticketCustomerMap.get(response._id)) {
        continue;
      }

      const createdAt = ticketCreationMap.get(response._id);
      if (createdAt) {
        const responseTime =
          (new Date(response.firstResponseDate).getTime() -
            new Date(createdAt).getTime()) /
          (1000 * 60 * 60); // Convert to hours
        responseTimes.push(responseTime);
      }
    }

    const responseTime: ResponseTimeData = {
      averageResponseTime:
        responseTimes.length > 0
          ? Math.round(
              responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
            )
          : 0,
      medianResponseTime:
        responseTimes.length > 0
          ? Math.round(
              responseTimes.sort((a, b) => a - b)[
                Math.floor(responseTimes.length / 2)
              ]
            )
          : 0,
      fastestResponse:
        responseTimes.length > 0 ? Math.round(Math.min(...responseTimes)) : 0,
      slowestResponse:
        responseTimes.length > 0 ? Math.round(Math.max(...responseTimes)) : 0,
    };

    // Calculate resolution time (time from ticket creation to resolution)
    const resolutionTimes: number[] = [];
    const resolvedTickets = (
      allTickets as unknown as Array<{
        resolvedAt?: Date;
        createdAt: Date;
      }>
    )
      .filter((t) => !!t.resolvedAt)
      .map((t) => ({
        resolvedAt: t.resolvedAt as Date,
        createdAt: t.createdAt,
      }));

    for (const ticket of resolvedTickets) {
      const resolutionTime =
        (new Date(ticket.resolvedAt).getTime() -
          new Date(ticket.createdAt).getTime()) /
        (1000 * 60 * 60); // Convert to hours
      resolutionTimes.push(resolutionTime);
    }

    const resolutionTime: ResolutionTimeData = {
      averageResolutionTime:
        resolutionTimes.length > 0
          ? Math.round(
              resolutionTimes.reduce((a, b) => a + b, 0) /
                resolutionTimes.length
            )
          : 0,
      medianResolutionTime:
        resolutionTimes.length > 0
          ? Math.round(
              resolutionTimes.sort((a, b) => a - b)[
                Math.floor(resolutionTimes.length / 2)
              ]
            )
          : 0,
      fastestResolution:
        resolutionTimes.length > 0
          ? Math.round(Math.min(...resolutionTimes))
          : 0,
      slowestResolution:
        resolutionTimes.length > 0
          ? Math.round(Math.max(...resolutionTimes))
          : 0,
    };

    // Calculate support performance - Optimized with aggregation
    const supportUsers = await usersCollection
      .find({ role: { $in: ["support", "admin"] } })
      .toArray();

    // Get all performance metrics in one aggregation query
    const performanceMetrics = await ticketsCollection
      .aggregate([
        {
          $match: {
            assignedToId: { $exists: true, $ne: null },
          },
        },
        {
          $group: {
            _id: "$assignedToId",
            assignedTickets: { $sum: 1 },
            resolvedTickets: {
              $sum: {
                $cond: [{ $in: ["$status", ["resolved", "closed"]] }, 1, 0],
              },
            },
            resolutionTimes: {
              $push: {
                $cond: [
                  { $ne: ["$resolvedAt", null] },
                  {
                    $divide: [
                      { $subtract: ["$resolvedAt", "$createdAt"] },
                      3600000, // Convert to hours
                    ],
                  },
                  null,
                ],
              },
            },
          },
        },
      ])
      .toArray();

    // Create a map of performance metrics by user ID
    const metricsMap = new Map<
      string,
      {
        assignedTickets: number;
        resolvedTickets: number;
        resolutionTimes: Array<number | null>;
      }
    >(
      (
        performanceMetrics as Array<{
          _id: string;
          assignedTickets: number;
          resolvedTickets: number;
          resolutionTimes: Array<number | null>;
        }>
      ).map((m) => [m._id, m])
    );

    const supportPerformance: SupportPerformance[] = (
      supportUsers as unknown as Array<{
        id: string;
        name: string;
        email: string;
        image?: string | null;
      }>
    ).map((user) => {
      const metrics = metricsMap.get(user.id);

      if (!metrics) {
        return {
          userId: user.id,
          name: user.name,
          email: user.email,
          image: user.image || null,
          assignedTickets: 0,
          resolvedTickets: 0,
          averageResolutionTime: 0,
          resolutionRate: 0,
        };
      }

      // Filter out null values and calculate average
      const validResolutionTimes = metrics.resolutionTimes.filter(
        (t: number | null) => t !== null
      );
      const averageResolutionTime =
        validResolutionTimes.length > 0
          ? Math.round(
              validResolutionTimes.reduce((a: number, b: number) => a + b, 0) /
                validResolutionTimes.length
            )
          : 0;

      return {
        userId: user.id,
        name: user.name,
        email: user.email,
        image: user.image || null,
        assignedTickets: metrics.assignedTickets,
        resolvedTickets: metrics.resolvedTickets,
        averageResolutionTime,
        resolutionRate:
          metrics.assignedTickets > 0
            ? Math.round(
                (metrics.resolvedTickets / metrics.assignedTickets) * 100
              )
            : 0,
      };
    });

    // Calculate overall stats
    const totalResolved = resolvedTickets.length;
    const totalOpen = await ticketsCollection.countDocuments({
      status: { $in: ["open", "in_progress", "waiting_on_customer"] },
    });
    const resolutionRate =
      totalTickets > 0 ? Math.round((totalResolved / totalTickets) * 100) : 0;

    return {
      success: true,
      data: {
        ticketTrends,
        categoryDistribution,
        priorityDistribution,
        statusDistribution,
        responseTime,
        resolutionTime,
        supportPerformance,
        totalTickets,
        totalResolved,
        totalOpen,
        resolutionRate,
      },
    };
  } catch (error) {
    console.error(
      "Get analytics data error:",
      error instanceof Error ? error : String(error)
    );
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to fetch analytics data",
    };
  }
}
