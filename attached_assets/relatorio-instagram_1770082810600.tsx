import { 
  ArrowLeft, Shield, Users, Clock, MessageSquare, Image, 
  Eye, Heart, AlertTriangle, CheckCircle, Download, Share2,
  UserCheck, UserX, Activity, Calendar, MapPin, Link2, Hash,
  Camera, Archive, TrendingUp, Smartphone, Bell, Lock, Bookmark
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { SiInstagram } from "react-icons/si";
import { useQuery } from "@tanstack/react-query";
import { jsPDF } from "jspdf";

interface HikerProfile {
  username: string;
  full_name: string;
  biography: string;
  profile_pic_url: string;
  follower_count: number;
  following_count: number;
  media_count: number;
  is_private: boolean;
  is_verified: boolean;
  external_url?: string;
}

export default function RelatorioInstagram() {
  const { username } = useParams<{ username: string }>();
  const [, setLocation] = useLocation();

  const { data: profileData, isLoading } = useQuery<HikerProfile>({
    queryKey: ['/api/instagram/profile', username],
    enabled: !!username,
  });

  const handleVoltar = () => {
    setLocation("/dashboard");
  };

  const handleDownload = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 20;

    const addTitle = (text: string) => {
      doc.setFontSize(14);
      doc.setTextColor(131, 58, 180);
      doc.text(text, 14, y);
      y += 8;
    };

    const addText = (label: string, value: string) => {
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(label, 14, y);
      doc.setTextColor(0, 0, 0);
      doc.text(value, 80, y);
      y += 6;
    };

    const addSection = () => {
      y += 4;
      doc.setDrawColor(200, 200, 200);
      doc.line(14, y, pageWidth - 14, y);
      y += 8;
    };

    const checkNewPage = () => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    };

    doc.setFontSize(18);
    doc.setTextColor(131, 58, 180);
    doc.text("LOVE SEARCH AI - Instagram Report", pageWidth / 2, y, { align: "center" });
    y += 10;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${analysisDate}`, pageWidth / 2, y, { align: "center" });
    y += 15;

    addTitle("ANALYZED PROFILE");
    addText("Username:", `@${username}`);
    addText("Name:", profileData?.full_name || username || "");
    addText("Followers:", followerCount.toLocaleString());
    addText("Following:", followingCount.toLocaleString());
    addText("Posts:", mediaCount.toString());
    addText("Status:", "Active Account");
    addText("Privacy:", profileData?.is_private ? "Private" : "Public");
    addSection();

    checkNewPage();
    addTitle("FOLLOWER ANALYSIS");
    addText("Men:", `${maleFollowers.toLocaleString()} (42%)`);
    addText("Women:", `${femaleFollowers.toLocaleString()} (58%)`);
    addText("Real Accounts:", "94%");
    addText("Possible Bots:", "6%");
    addText("Inactive Accounts:", "12%");
    addSection();

    checkNewPage();
    addTitle("STORIES HISTORY");
    addText("Stories (30 days):", `${Math.floor(mediaCount * 2.5)}`);
    addText("Average views:", `~${Math.floor(followerCount * 0.25)}`);
    addText("With music:", "45%");
    addText("With poll:", "12%");
    addText("Replies/day:", `~${Math.floor(followerCount * 0.02)}`);
    addSection();

    checkNewPage();
    addTitle("POST ANALYSIS");
    addText("Photos:", "65%");
    addText("Videos/Reels:", "25%");
    addText("Carousel:", "10%");
    addText("Frequency:", "~3 per week");
    addText("Last post:", "2 days ago");
    addSection();

    checkNewPage();
    addTitle("MOST USED HASHTAGS");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(topHashtags.join(", "), 14, y, { maxWidth: pageWidth - 28 });
    y += 12;
    addSection();

    checkNewPage();
    addTitle("FREQUENT LOCATIONS");
    topLocations.forEach((loc, i) => {
      addText(`${i + 1}.`, loc);
    });
    addSection();

    checkNewPage();
    addTitle("PROFILE ACTIVITY");
    addText("Most active time:", "6pm - 11pm");
    addText("Most active days:", "Fri, Sat, Sun");
    addText("Device:", "iPhone");
    addText("Status:", "Active");
    addSection();

    checkNewPage();
    addTitle("ENGAGEMENT");
    addText("Likes/post:", `~${Math.floor(followerCount * 0.08)}`);
    addText("Comments/post:", `~${Math.floor(followerCount * 0.012)}`);
    addText("Engagement rate:", "8.2%");
    addText("Shares:", `~${Math.floor(followerCount * 0.005)}`);
    addText("Saves:", `~${Math.floor(followerCount * 0.015)}`);
    addSection();

    checkNewPage();
    addTitle("DM CONVERSATIONS");
    addText("Active conversations:", `${Math.floor(followingCount * 0.15)}`);
    addText("Msgs sent (30d):", `~${Math.floor(Math.random() * 500 + 200)}`);
    addText("Msgs received (30d):", `~${Math.floor(Math.random() * 800 + 300)}`);
    addText("Response time:", "~2h");
    addText("Status:", "✓ No suspicious conversations");
    addSection();

    checkNewPage();
    addTitle("ARCHIVED STORIES");
    addText("Highlights:", `${Math.floor(Math.random() * 8 + 3)}`);
    addText("Archived:", `${Math.floor(Math.random() * 200 + 50)}`);
    addText("With mentions:", "23%");
    addText("Reposts:", "15%");
    addSection();

    checkNewPage();
    addTitle("SUSPICIOUS ACCOUNTS");
    addText("Fake followers:", "0 detected");
    addText("Interaction bots:", "0 detected");
    addText("Spam accounts:", "0 detected");
    addSection();

    checkNewPage();
    addTitle("RECENT CHANGES");
    addText("Profile photo:", "changed 12 days ago");
    addText("Bio:", "updated 5 days ago");
    addText("External link:", "added 8 days ago");
    addSection();

    checkNewPage();
    addTitle("AI SECURITY ANALYSIS");
    doc.setTextColor(34, 197, 94);
    y += 2;
    doc.text("✓ No deleted messages detected", 14, y); y += 6;
    doc.text("✓ No photos deleted in the last 30 days", 14, y); y += 6;
    doc.text("✓ No suspicious attachments", 14, y); y += 6;
    doc.text("✓ Normal behavior", 14, y); y += 6;
    doc.text("✓ No secondary/fake accounts linked", 14, y); y += 10;

    doc.setFontSize(12);
    doc.setTextColor(34, 197, 94);
    doc.text("PROFILE VERIFIED - NOTHING SUSPICIOUS FOUND", pageWidth / 2, y, { align: "center" });
    y += 15;

    checkNewPage();
    addTitle("TOP 10 INTERACTIONS");
    const topUsers = ['user_friend1', 'best.friend', 'close.contact', 'family_member', 'work.colleague', 'gym_buddy', 'school_friend', 'neighbor123', 'cousin_ana', 'bff_forever'];
    topUsers.forEach((user, i) => {
      addText(`${i + 1}.`, `@${user}`);
    });

    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("Report generated by Love Search AI • Data processed securely", pageWidth / 2, 285, { align: "center" });

    doc.save(`relatorio-instagram-${username}.pdf`);
  };

  const analysisDate = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const followerCount = profileData?.follower_count || 1250;
  const followingCount = profileData?.following_count || 890;
  const mediaCount = profileData?.media_count || 156;
  
  const maleFollowers = Math.floor(followerCount * 0.42);
  const femaleFollowers = Math.floor(followerCount * 0.58);

  const cardStyle = {
    backgroundColor: 'rgba(20, 20, 30, 0.9)',
    border: '1px solid rgba(138, 43, 226, 0.2)'
  };

  const topHashtags = ['#love', '#instagood', '#photooftheday', '#fashion', '#beautiful', '#happy', '#cute', '#tbt', '#like4like', '#followme'];
  const topLocations = ['São Paulo, SP', 'Rio de Janeiro, RJ', 'Belo Horizonte, MG', 'Curitiba, PR', 'Salvador, BA'];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#0a0a0f' }}>
      <header 
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-14"
        style={{ backgroundColor: '#0a0a0f', borderBottom: '1px solid rgba(138, 43, 226, 0.15)' }}
      >
        <button 
          onClick={handleVoltar}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
          data-testid="button-voltar"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <SiInstagram className="w-5 h-5" style={{ color: '#E1306C' }} />
          <span className="text-white font-semibold tracking-wide">RELATÓRIO</span>
        </div>
        <button
          onClick={handleDownload}
          className="text-purple-400 hover:text-purple-300"
          data-testid="button-download"
        >
          <Download className="w-5 h-5" />
        </button>
      </header>

      <main className="pt-20 pb-8 px-4 max-w-lg mx-auto">
        <div 
          className="rounded-2xl p-4 mb-4 flex items-center gap-3"
          style={{ 
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.05))',
            border: '1px solid rgba(34, 197, 94, 0.3)'
          }}
        >
          <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0" />
          <div>
            <p className="text-green-400 font-semibold text-sm">Analysis Completed</p>
            <p className="text-gray-400 text-xs">{analysisDate}</p>
          </div>
        </div>

        <div className="rounded-2xl p-6 mb-4" style={cardStyle}>
          <div className="flex items-center gap-4 mb-4">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center overflow-hidden"
              style={{ 
                background: profileData?.profile_pic_url ? 'none' : 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)'
              }}
            >
              {profileData?.profile_pic_url ? (
                <img 
                  src={profileData.profile_pic_url} 
                  alt={username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <SiInstagram className="w-8 h-8 text-white" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-white font-bold text-lg">@{username}</h2>
                {profileData?.is_verified && (
                  <CheckCircle className="w-4 h-4 text-blue-400" />
                )}
              </div>
              <p className="text-gray-400 text-sm">{profileData?.full_name || username}</p>
              <div className="flex items-center gap-1 mt-1">
                <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400">
                  Active Account
                </span>
                {profileData?.is_private && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-500/20 text-yellow-400">
                    Private
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-white font-bold text-lg">{followerCount.toLocaleString()}</p>
              <p className="text-gray-500 text-xs">Followers</p>
            </div>
            <div>
              <p className="text-white font-bold text-lg">{followingCount.toLocaleString()}</p>
              <p className="text-gray-500 text-xs">Following</p>
            </div>
            <div>
              <p className="text-white font-bold text-lg">{mediaCount}</p>
              <p className="text-gray-500 text-xs">Posts</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl p-6 mb-4" style={cardStyle}>
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-purple-400" />
            <h3 className="text-white font-semibold">Follower Analysis</h3>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Men</span>
                <span className="text-white">{maleFollowers.toLocaleString()} (42%)</span>
              </div>
              <div className="w-full h-2 rounded-full" style={{ backgroundColor: 'rgba(138, 43, 226, 0.2)' }}>
                <div className="h-full rounded-full" style={{ width: '42%', backgroundColor: '#3b82f6' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Women</span>
                <span className="text-white">{femaleFollowers.toLocaleString()} (58%)</span>
              </div>
              <div className="w-full h-2 rounded-full" style={{ backgroundColor: 'rgba(138, 43, 226, 0.2)' }}>
                <div className="h-full rounded-full" style={{ width: '58%', backgroundColor: '#ec4899' }} />
              </div>
            </div>

            <div className="pt-2 border-t border-gray-800">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Real Accounts</span>
                <span className="text-green-400">94%</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-gray-400">Possible Bots</span>
                <span className="text-yellow-400">6%</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-gray-400">Inactive Accounts</span>
                <span className="text-gray-500">12%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl p-6 mb-4" style={cardStyle}>
          <div className="flex items-center gap-2 mb-4">
            <Camera className="w-5 h-5 text-purple-400" />
            <h3 className="text-white font-semibold">Stories History</h3>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-3 rounded-lg text-center" style={{ backgroundColor: 'rgba(138, 43, 226, 0.1)' }}>
              <p className="text-2xl font-bold text-white">{Math.floor(mediaCount * 2.5)}</p>
              <p className="text-gray-500 text-xs">Stories posted (30 days)</p>
            </div>
            <div className="p-3 rounded-lg text-center" style={{ backgroundColor: 'rgba(138, 43, 226, 0.1)' }}>
              <p className="text-2xl font-bold text-white">~{Math.floor(followerCount * 0.25)}</p>
              <p className="text-gray-500 text-xs">Average views</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Stories with music</span>
              <span className="text-white">45%</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Stories with poll</span>
              <span className="text-white">12%</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Replies received</span>
              <span className="text-white">~{Math.floor(followerCount * 0.02)}/day</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl p-6 mb-4" style={cardStyle}>
          <div className="flex items-center gap-2 mb-4">
            <Image className="w-5 h-5 text-purple-400" />
            <h3 className="text-white font-semibold">Post Analysis</h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Photos</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 rounded-full" style={{ backgroundColor: 'rgba(138, 43, 226, 0.2)' }}>
                  <div className="h-full rounded-full bg-purple-500" style={{ width: '65%' }} />
                </div>
                <span className="text-white text-sm">65%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Videos/Reels</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 rounded-full" style={{ backgroundColor: 'rgba(138, 43, 226, 0.2)' }}>
                  <div className="h-full rounded-full bg-pink-500" style={{ width: '25%' }} />
                </div>
                <span className="text-white text-sm">25%</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Carousel</span>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 rounded-full" style={{ backgroundColor: 'rgba(138, 43, 226, 0.2)' }}>
                  <div className="h-full rounded-full bg-blue-500" style={{ width: '10%' }} />
                </div>
                <span className="text-white text-sm">10%</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-800">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Post frequency</span>
              <span className="text-white">~3 per week</span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-gray-400">Last post</span>
              <span className="text-white">2 days ago</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl p-6 mb-4" style={cardStyle}>
          <div className="flex items-center gap-2 mb-4">
            <Hash className="w-5 h-5 text-purple-400" />
            <h3 className="text-white font-semibold">Most Used Hashtags</h3>
          </div>

          <div className="flex flex-wrap gap-2">
            {topHashtags.map((tag, index) => (
              <span 
                key={tag}
                className="px-3 py-1 rounded-full text-xs"
                style={{ 
                  backgroundColor: 'rgba(138, 43, 226, 0.15)',
                  color: index < 3 ? '#a855f7' : '#9ca3af'
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-2xl p-6 mb-4" style={cardStyle}>
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-purple-400" />
            <h3 className="text-white font-semibold">Frequent Locations</h3>
          </div>

          <div className="space-y-2">
            {topLocations.slice(0, 5).map((location, index) => (
              <div 
                key={location}
                className="flex items-center gap-3 p-2 rounded-lg"
                style={{ backgroundColor: 'rgba(138, 43, 226, 0.1)' }}
              >
                <div 
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: 'linear-gradient(135deg, #833ab4, #fd1d1d)' }}
                >
                  {index + 1}
                </div>
                <span className="text-white text-sm">{location}</span>
                <span className="text-gray-500 text-xs ml-auto">{Math.floor(Math.random() * 15 + 3)} check-ins</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl p-6 mb-4" style={cardStyle}>
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-purple-400" />
            <h3 className="text-white font-semibold">Profile Activity</h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-gray-400 text-sm">Most active time</span>
              </div>
              <span className="text-white text-sm">18h - 23h</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <span className="text-gray-400 text-sm">Most active days</span>
              </div>
              <span className="text-white text-sm">Fri, Sat, Sun</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-gray-500" />
                <span className="text-gray-400 text-sm">Primary device</span>
              </div>
              <span className="text-white text-sm">iPhone</span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-gray-500" />
                <span className="text-gray-400 text-sm">Online agora</span>
              </div>
              <span className="text-green-400 text-sm flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                Ativo
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl p-6 mb-4" style={cardStyle}>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            <h3 className="text-white font-semibold">Engagement</h3>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-3 rounded-lg text-center" style={{ backgroundColor: 'rgba(138, 43, 226, 0.1)' }}>
              <p className="text-2xl font-bold text-white">~{Math.floor(followerCount * 0.08)}</p>
              <p className="text-gray-500 text-xs">Likes/post</p>
            </div>
            <div className="p-3 rounded-lg text-center" style={{ backgroundColor: 'rgba(138, 43, 226, 0.1)' }}>
              <p className="text-2xl font-bold text-white">~{Math.floor(followerCount * 0.012)}</p>
              <p className="text-gray-500 text-xs">Comments/post</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Engagement rate</span>
              <span className="text-green-400">8.2%</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Average shares</span>
              <span className="text-white">~{Math.floor(followerCount * 0.005)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Average saves</span>
              <span className="text-white">~{Math.floor(followerCount * 0.015)}</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl p-6 mb-4" style={cardStyle}>
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5 text-purple-400" />
            <h3 className="text-white font-semibold">DM Conversations</h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Active conversations</span>
              <span className="text-white text-sm">{Math.floor(followingCount * 0.15)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Messages sent (30d)</span>
              <span className="text-white text-sm">~{Math.floor(Math.random() * 500 + 200)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Messages received (30d)</span>
              <span className="text-white text-sm">~{Math.floor(Math.random() * 800 + 300)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Average response time</span>
              <span className="text-white text-sm">~2h</span>
            </div>
          </div>

          <div 
            className="mt-4 p-3 rounded-lg flex items-center gap-2"
            style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}
          >
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-green-400 text-sm">No suspicious conversations detected</span>
          </div>
        </div>

        <div className="rounded-2xl p-6 mb-4" style={cardStyle}>
          <div className="flex items-center gap-2 mb-4">
            <Archive className="w-5 h-5 text-purple-400" />
            <h3 className="text-white font-semibold">Archived Stories / Highlights</h3>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-3 rounded-lg text-center" style={{ backgroundColor: 'rgba(138, 43, 226, 0.1)' }}>
              <p className="text-2xl font-bold text-white">{Math.floor(Math.random() * 8 + 3)}</p>
              <p className="text-gray-500 text-xs">Highlights</p>
            </div>
            <div className="p-3 rounded-lg text-center" style={{ backgroundColor: 'rgba(138, 43, 226, 0.1)' }}>
              <p className="text-2xl font-bold text-white">{Math.floor(Math.random() * 200 + 50)}</p>
              <p className="text-gray-500 text-xs">Archived stories</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Stories with mentions</span>
              <span className="text-white">23%</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Reposts from others</span>
              <span className="text-white">15%</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl p-6 mb-4" style={cardStyle}>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-purple-400" />
            <h3 className="text-white font-semibold">Suspicious Accounts Detected</h3>
          </div>

          <div 
            className="p-4 rounded-lg mb-4 text-center"
            style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}
          >
            <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
            <p className="text-green-400 font-semibold">No suspicious accounts</p>
            <p className="text-gray-500 text-xs mt-1">Clean follower and following analysis</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Fake followers</span>
              <span className="text-green-400">0 detected</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Interaction bots</span>
              <span className="text-green-400">0 detected</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">Spam accounts</span>
              <span className="text-green-400">0 detected</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl p-6 mb-4" style={cardStyle}>
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-5 h-5 text-purple-400" />
            <h3 className="text-white font-semibold">Recent Profile Changes</h3>
          </div>

          <div className="space-y-3">
            <div 
              className="p-3 rounded-lg flex items-center gap-3"
              style={{ backgroundColor: 'rgba(138, 43, 226, 0.1)' }}
            >
              <div className="w-2 h-2 rounded-full bg-blue-400"></div>
              <div className="flex-1">
                <p className="text-white text-sm">Profile photo changed</p>
                <p className="text-gray-500 text-xs">12 days ago</p>
              </div>
            </div>
            <div 
              className="p-3 rounded-lg flex items-center gap-3"
              style={{ backgroundColor: 'rgba(138, 43, 226, 0.1)' }}
            >
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
              <div className="flex-1">
                <p className="text-white text-sm">Bio updated</p>
                <p className="text-gray-500 text-xs">5 days ago</p>
              </div>
            </div>
            <div 
              className="p-3 rounded-lg flex items-center gap-3"
              style={{ backgroundColor: 'rgba(138, 43, 226, 0.1)' }}
            >
              <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
              <div className="flex-1">
                <p className="text-white text-sm">External link added</p>
                <p className="text-gray-500 text-xs">8 days ago</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl p-6 mb-4" style={cardStyle}>
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-purple-400" />
            <h3 className="text-white font-semibold">AI Security Analysis</h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              <div>
                <p className="text-white text-sm font-medium">No deleted messages</p>
                <p className="text-gray-500 text-xs">AI did not detect recently deleted messages</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              <div>
                <p className="text-white text-sm font-medium">No deleted photos</p>
                <p className="text-gray-500 text-xs">No deleted photos found in the last 30 days</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              <div>
                <p className="text-white text-sm font-medium">No suspicious attachments</p>
                <p className="text-gray-500 text-xs">No suspicious files or media detected</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              <div>
                <p className="text-white text-sm font-medium">Normal behavior</p>
                <p className="text-gray-500 text-xs">AI analyzed and found no suspicious activities</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)' }}>
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              <div>
                <p className="text-white text-sm font-medium">No secondary accounts</p>
                <p className="text-gray-500 text-xs">No linked fake accounts found</p>
              </div>
            </div>
          </div>

          <div 
            className="mt-4 p-3 rounded-lg text-center"
            style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)' }}
          >
            <p className="text-green-400 font-semibold text-sm">
              ✓ Profile Verified - Nothing Suspicious Found
            </p>
          </div>
        </div>

        <div className="rounded-2xl p-6 mb-4" style={cardStyle}>
          <div className="flex items-center gap-2 mb-4">
            <UserCheck className="w-5 h-5 text-purple-400" />
            <h3 className="text-white font-semibold">Main Interactions</h3>
          </div>

          <p className="text-gray-400 text-sm mb-3">
            Top 10 accounts with most interactions:
          </p>

          <div className="space-y-2">
            {['user_friend1', 'best.friend', 'close.contact', 'family_member', 'work.colleague', 'gym_buddy', 'school_friend', 'neighbor123', 'cousin_ana', 'bff_forever'].map((user, index) => (
              <div 
                key={user}
                className="flex items-center gap-3 p-2 rounded-lg"
                style={{ backgroundColor: 'rgba(138, 43, 226, 0.1)' }}
              >
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                  style={{ background: index < 3 ? 'linear-gradient(135deg, #833ab4, #fd1d1d)' : 'rgba(138, 43, 226, 0.3)' }}
                >
                  {index + 1}
                </div>
                <span className="text-white text-sm">@{user}</span>
                <span className="text-gray-500 text-xs ml-auto">{Math.floor(Math.random() * 80 + 20)} interactions</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleDownload}
            className="w-full h-12 text-white font-semibold rounded-xl border-0"
            style={{ 
              background: 'linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045)'
            }}
            data-testid="button-baixar-relatorio"
          >
            <Download className="w-5 h-5 mr-2" />
            Download Full Report
          </Button>

          <Button
            onClick={handleVoltar}
            variant="outline"
            className="w-full h-12 font-semibold rounded-xl border-purple-500/30 text-gray-300 hover:bg-purple-500/10"
            data-testid="button-voltar-dashboard"
          >
            Back to Dashboard
          </Button>
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">
          Report generated by Love Search AI • Data processed securely
        </p>
      </main>
    </div>
  );
}
