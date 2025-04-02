import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface VideoAnalytics {
  id: string;
  title: string;
  totalViews: number;
  uniqueViewers: number;
  averageWatchTime: number;
  completionRate: number;
  skipRate: number;
  rewatchRate: number;
}

interface UserEngagement {
  userId: string;
  email: string;
  totalVideosWatched: number;
  averageWatchTime: number;
  completionRate: number;
  lastActive: string;
}

interface AnalyticsData {
  videos: VideoAnalytics[];
  users: UserEngagement[];
  totalUsers: number;
  totalVideos: number;
  totalViews: number;
  averageEngagement: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch('/api/admin/analytics');
        if (!response.ok) {
          throw new Error('Failed to fetch analytics');
        }
        const data = await response.json();
        setAnalytics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading analytics...</div>;
  }

  if (error) {
    return <div className="text-red-500 text-center p-4">{error}</div>;
  }

  if (!analytics) {
    return <div className="text-center p-4">No analytics data available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-500">Total Users</h3>
          <p className="text-2xl font-bold">{analytics.totalUsers}</p>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-500">Total Videos</h3>
          <p className="text-2xl font-bold">{analytics.totalVideos}</p>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-500">Total Views</h3>
          <p className="text-2xl font-bold">{analytics.totalViews}</p>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-medium text-gray-500">Avg. Engagement</h3>
          <p className="text-2xl font-bold">{analytics.averageEngagement}%</p>
        </Card>
      </div>

      {/* Detailed Analytics Tabs */}
      <Tabs defaultValue="videos" className="space-y-4">
        <TabsList>
          <TabsTrigger value="videos">Video Analytics</TabsTrigger>
          <TabsTrigger value="users">User Engagement</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="videos" className="space-y-4">
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4">Most Watched Videos</h3>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.videos.slice(0, 5)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="title" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="totalViews" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-4">Completion Rates</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={analytics.videos}
                      dataKey="completionRate"
                      nameKey="title"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {analytics.videos.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-4">Skip & Rewatch Rates</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={analytics.videos}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="title" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="skipRate" stroke="#8884d8" />
                    <Line type="monotone" dataKey="rewatchRate" stroke="#82ca9d" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4">User Engagement</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">User</th>
                    <th className="text-left py-2">Videos Watched</th>
                    <th className="text-left py-2">Avg. Watch Time</th>
                    <th className="text-left py-2">Completion Rate</th>
                    <th className="text-left py-2">Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.users.map((user) => (
                    <tr key={user.userId} className="border-b">
                      <td className="py-2">{user.email}</td>
                      <td className="py-2">{user.totalVideosWatched}</td>
                      <td className="py-2">{Math.round(user.averageWatchTime)}%</td>
                      <td className="py-2">
                        <Progress value={user.completionRate} className="w-24" />
                      </td>
                      <td className="py-2">{new Date(user.lastActive).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4">Engagement Trends</h3>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.videos}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="title" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="averageWatchTime" stroke="#8884d8" />
                  <Line type="monotone" dataKey="uniqueViewers" stroke="#82ca9d" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 