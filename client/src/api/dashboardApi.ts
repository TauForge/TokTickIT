import { apiGet } from "./apiClient";

export interface RequesterRowDto {
  id: string;
  ticketNumber: string;
  summary: string;
  status: string;
  updatedAt: string;
}

export interface RequesterDashboardDto {
  counts: { myOpen: number; inProgress: number; waitingForMe: number; resolved: number; closed: number };
  recentlyUpdated: RequesterRowDto[];
  recentlyResolved: RequesterRowDto[];
  generatedAt: string;
}

export interface StaffRowDto {
  id: string;
  ticketNumber: string;
  summary: string;
  status: string;
  itPriority: string;
  ownerDisplayName: string | null;
  updatedAt: string;
}

export interface RecentActionDto {
  id: string;
  ticketId: string;
  ticketNumber: string;
  description: string;
  actionAt: string;
}

export interface StaffDashboardDto {
  counts: {
    new: number;
    open: number;
    inProgress: number;
    waitingForRequester: number;
    myAssigned: number;
    unassigned: number;
    byItPriority: { LOW: number; MEDIUM: number; HIGH: number };
  };
  urgent: StaffRowDto[];
  recentlyUpdated: StaffRowDto[];
  myRecentActions: RecentActionDto[];
  userCounts?: { active: number; inactive: number; requester: number; itStaff: number; administrator: number };
  generatedAt: string;
}

function assertObject<T extends { counts: unknown }>(value: T): T {
  if (!value || typeof value !== "object" || !value.counts) throw new Error("Unexpected dashboard response");
  return value;
}

export async function getRequesterDashboard(): Promise<RequesterDashboardDto> {
  return assertObject(await apiGet<RequesterDashboardDto>("/api/v1/dashboard/requester"));
}

export async function getStaffDashboard(): Promise<StaffDashboardDto> {
  return assertObject(await apiGet<StaffDashboardDto>("/api/v1/dashboard/staff"));
}
