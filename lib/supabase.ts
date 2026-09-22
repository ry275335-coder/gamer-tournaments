import { createClient } from "@supabase/supabase-js";

function getTabId() {
  if (typeof window === "undefined") {
    return "server";
  }

  let tabId = sessionStorage.getItem("gamearena-tab-id");

  if (!tabId) {
    tabId =
      crypto.randomUUID();

    sessionStorage.setItem(
      "gamearena-tab-id",
      tabId
    );
  }

  return tabId;
}

const tabId = getTabId();

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  {
    auth: {
      storage:
        typeof window !== "undefined"
          ? window.sessionStorage
          : undefined,

      storageKey:
        `gamearena-auth-${tabId}`,

      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

// College verification functions
export const getCollegeVerificationByUserId = async (userId: string) => {
  const { data, error } = await supabase
    .from('college_verifications')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 means no rows returned
    console.error('Error fetching college verification:', error);
    return null;
  }
  return data;
};

export const createCollegeVerification = async (verificationData: {
  user_id: string;
  college_name: string;
  student_id_image_url?: string;
}) => {
  const { data, error } = await supabase
    .from('college_verifications')
    .insert([verificationData])
    .select()
    .single();

  if (error) {
    console.error('Error creating college verification:', error);
    throw error;
  }
  return data;
};

export const updateCollegeVerificationStatus = async (verificationId: string, status: 'approved' | 'rejected') => {
  const { data, error } = await supabase
    .from('college_verifications')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', verificationId)
    .select()
    .single();

  if (error) {
    console.error('Error updating college verification status:', error);
    throw error;
  }
  return data;
};

// Tournament report functions
export const createTournamentReport = async (reportData: {
  tournament_id: string;
  reported_by?: string;
  reason: string;
}) => {
  const { data, error } = await supabase
    .from('tournament_reports')
    .insert([reportData])
    .select()
    .single();

  if (error) {
    console.error('Error creating tournament report:', error);
    throw error;
  }
  return data;
};

export const getTournamentReports = async (tournamentId: string) => {
  const { data, error } = await supabase
    .from('tournament_reports')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching tournament reports:', error);
    return [];
  }
  return data;
};

// Tournament template functions
export const getTournamentTemplates = async () => {
  const { data, error } = await supabase
    .from('tournament_templates')
    .select('*');

  if (error) {
    console.error('Error fetching tournament templates:', error);
    return [];
  }
  return data;
};

export const createTournamentTemplate = async (templateData: {
  name: string;
  format: 'solo' | 'squad';
  rules_text?: string;
}) => {
  const { data, error } = await supabase
    .from('tournament_templates')
    .insert([templateData])
    .select()
    .single();

  if (error) {
    console.error('Error creating tournament template:', error);
    throw error;
  }
  return data;
};

// College leaderboard functions
export const getCollegeLeaderboard = async () => {
  const { data, error } = await supabase
    .from('college_leaderboard')
    .select('*')
    .order('points', { ascending: false });

  if (error) {
    console.error('Error fetching college leaderboard:', error);
    return [];
  }
  return data;
};

export const updateCollegePoints = async (collegeName: string, pointsToAdd: number) => {
  // First check if college exists
  const { data: existingData } = await supabase
    .from('college_leaderboard')
    .select('*')
    .eq('college_name', collegeName)
    .single();

  if (existingData) {
    // Update existing
    const { data, error } = await supabase
      .from('college_leaderboard')
      .update({ points: existingData.points + pointsToAdd, last_updated: new Date().toISOString() })
      .eq('college_name', collegeName)
      .select()
      .single();

    if (error) {
      console.error('Error updating college points:', error);
      throw error;
    }
    return data;
  } else {
    // Create new entry
    const { data, error } = await supabase
      .from('college_leaderboard')
      .insert([{ college_name: collegeName, points: pointsToAdd }])
      .select()
      .single();

    if (error) {
      console.error('Error creating college leaderboard entry:', error);
      throw error;
    }
    return data;
  }
};

// Tournament share log functions
export const logTournamentShare = async (shareData: {
  tournament_id: string;
  shared_to_platform: 'whatsapp' | 'instagram' | 'facebook' | 'twitter';
}) => {
  const { data, error } = await supabase
    .from('tournament_share_logs')
    .insert([shareData])
    .select()
    .single();

  if (error) {
    console.error('Error logging tournament share:', error);
    throw error;
  }
  return data;
};

export const getTournamentShareCount = async (tournamentId: string) => {
  const { data, error, count } = await supabase
    .from('tournament_share_logs')
    .select('*', { count: 'exact' })
    .eq('tournament_id', tournamentId);

  if (error) {
    console.error('Error getting tournament share count:', error);
    return 0;
  }
  return count || 0;
};