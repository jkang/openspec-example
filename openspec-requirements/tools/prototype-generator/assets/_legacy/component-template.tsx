use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, Users, Award, Clock, ChevronRight, PlayCircle, CheckCircle2, Star } from "lucide-react";

// 用户角色数据
const USER_PERSONAS = [
  {
    id: "newbie",
    name: "小李",
    role: "职场新人",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Li",
    description: "刚入职 3 个月的产品助理，希望快速提升专业技能",
    goals: ["掌握需求文档撰写", "学习数据分析基础", "了解产品开发流程"],
    painPoints: ["不知道从何学起", "缺乏实战经验", "成长路径不清晰"],
    skillLevel: "初级",
    weeklyTime: "10-15 小时",
    preferredContent: ["视频课程", "案例分析", "实战项目"]
  },
  {
    id: "professional",
    name: "王经理",
    role: "资深产品经理",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Wang",
    description: "5 年经验的产品经理，带领 8 人团队，需要提升管理能力",
    goals: ["提升团队管理效率", "学习数据驱动决策", "拓展行业视野"],
    painPoints: ["团队效率低", "决策缺乏数据支撑", "时间管理困难"],
    skillLevel: "高级",
    weeklyTime: "3-5 小时",
    preferredContent: ["行业报告", "管理方法论", "高管分享"]
  },
  {
    id: "switcher",
    name: "张工程师",
    role: "转岗开发者",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Zhang",
    description: "3 年开发经验，计划转型产品经理，需要系统学习产品思维",
    goals: ["建立产品思维", "学习用户研究方法", "掌握产品设计工具"],
    painPoints: ["技术思维惯性", "缺乏用户视角", "沟通表达需要提升"],
    skillLevel: "中级",
    weeklyTime: "8-12 小时",
    preferredContent: ["交互课程", "用户研究", "产品设计工具"]
  }
];

// 推荐课程数据（针对不同用户角色）
const RECOMMENDED_COURSES = {
  newbie: [
    {
      id: 1,
      title: "产品经理入门必修课",
      instructor: "陈老师",
      duration: "12小时",
      students: 12580,
      rating: 4.8,
      progress: 0,
      image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400",
      tags: ["入门", "体系化"],
      description: "从 0 到 1 掌握产品思维与工作方法"
    },
    {
      id: 2,
      title: "需求文档写作实战",
      instructor: "刘专家",
      duration: "8小时",
      students: 8920,
      rating: 4.9,
      progress: 35,
      image: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400",
      tags: ["实战", "文档"],
      description: "PRD、MRD、BRD 写作规范与模板"
    },
    {
      id: 3,
      title: "数据分析入门",
      instructor: "赵分析师",
      duration: "15小时",
      students: 15670,
      rating: 4.7,
      progress: 0,
      image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400",
      tags: ["数据", "SQL"],
      description: "产品必备的数据分析技能"
    }
  ],
  professional: [
    {
      id: 4,
      title: "数据驱动的产品决策",
      instructor: "马总监",
      duration: "10小时",
      students: 5670,
      rating: 4.9,
      progress: 0,
      image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400",
      tags: ["决策", "高级"],
      description: "用数据说话，提升决策质量"
    },
    {
      id: 5,
      title: "高效团队管理",
      instructor: "孙CEO",
      duration: "8小时",
      students: 4230,
      rating: 4.8,
      progress: 60,
      image: "https://images.unsplash.com/photo-1552664730-d307ca884978?w=400",
      tags: ["管理", "领导力"],
      description: "打造高绩效产品团队的方法论"
    }
  ],
  switcher: [
    {
      id: 6,
      title: "从开发到产品的思维转型",
      instructor: "周产品专家",
      duration: "10小时",
      students: 3890,
      rating: 4.8,
      progress: 0,
      image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400",
      tags: ["转型", "思维"],
      description: "技术背景转产品的最佳实践"
    },
    {
      id: 7,
      title: "用户研究与洞察",
      instructor: "吴用研专家",
      duration: "12小时",
      students: 6780,
      rating: 4.7,
      progress: 25,
      image: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=400",
      tags: ["用研", "洞察"],
      description: "深度理解用户的方法与工具"
    }
  ]
};

// 学习路径数据
const LEARNING_PATHS = {
  newbie: {
    title: "职场新人成长路径",
    stages: [
      { name: "产品基础", duration: "2周", courses: 5, completed: true },
      { name: "需求分析", duration: "3周", courses: 4, completed: false },
      { name: "项目管理", duration: "2周", courses: 3, completed: false },
      { name: "数据分析", duration: "3周", courses: 4, completed: false }
    ],
    totalProgress: 15
  },
  professional: {
    title: "管理进阶路径",
    stages: [
      { name: "数据决策", duration: "2周", courses: 3, completed: true },
      { name: "团队管理", duration: "3周", courses: 4, completed: false },
      { name: "战略规划", duration: "4周", courses: 5, completed: false }
    ],
    totalProgress: 25
  },
  switcher: {
    title: "技术转产品路径",
    stages: [
      { name: "思维转型", duration: "2周", courses: 4, completed: true },
      { name: "用户研究", duration: "3周", courses: 5, completed: false },
      { name: "产品设计", duration: "3周", courses: 4, completed: false }
    ],
    totalProgress: 20
  }
};

export default function Dashboard() {
  const [selectedPersona, setSelectedPersona] = useState<string>("newbie");
  const [activeTab, setActiveTab] = useState("courses");

  const currentPersona = USER_PERSONAS.find(p => p.id === selectedPersona)!;
  const currentCourses = RECOMMENDED_COURSES[selectedPersona as keyof typeof RECOMMENDED_COURSES];
  const currentPath = LEARNING_PATHS[selectedPersona as keyof typeof LEARNING_PATHS];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航 */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">ProductLearn</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm">我的学习</Button>
            <Button variant="ghost" size="sm">课程中心</Button>
            <Avatar className="h-8 w-8">
              <AvatarImage src={currentPersona.avatar} />
              <AvatarFallback>{currentPersona.name[0]}</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 角色选择器 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              切换用户视角体验不同学习路径
            </CardTitle>
            <CardDescription>
              点击下方卡片，查看为不同角色定制的学习体验
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {USER_PERSONAS.map((persona) => (
                <button
                  key={persona.id}
                  onClick={() => setSelectedPersona(persona.id)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    selectedPersona === persona.id
                      ? "border-blue-600 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={persona.avatar} />
                      <AvatarFallback>{persona.name[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-gray-900">{persona.name}</p>
                      <p className="text-sm text-gray-500">{persona.role}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="mb-2">{persona.skillLevel}</Badge>
                  <p className="text-sm text-gray-600 line-clamp-2">{persona.description}</p>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 当前角色概览 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* 左侧：用户画像详情 */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={currentPersona.avatar} />
                  <AvatarFallback>{currentPersona.name[0]}</AvatarFallback>
                </Avatar>
                {currentPersona.name}的学习档案
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">学习目标</h4>
                <ul className="space-y-2">
                  {currentPersona.goals.map((goal, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      <span>{goal}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-2">当前痛点</h4>
                <ul className="space-y-2">
                  {currentPersona.painPoints.map((pain, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-orange-600">
                      <span className="text-orange-400">•</span>
                      <span>{pain}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="pt-4 border-t">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-500">每周学习时间</span>
                  <span className="font-medium">{currentPersona.weeklyTime}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">偏好内容类型</span>
                  <span className="font-medium">{currentPersona.preferredContent.join("、")}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 右侧：学习进度和推荐 */}
          <Card className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>个性化学习空间</CardTitle>
                  <TabsList>
                    <TabsTrigger value="courses">推荐课程</TabsTrigger>
                    <TabsTrigger value="path">学习路径</TabsTrigger>
                  </TabsList>
                </div>
              </CardHeader>
              <CardContent>
                <TabsContent value="courses" className="mt-0">
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                      {currentCourses.map((course) => (
                        <Card key={course.id} className="overflow-hidden hover:shadow-md transition-shadow">
                          <div className="flex flex-col sm:flex-row">
                            <div className="sm:w-48 h-32 sm:h-auto shrink-0">
                              <img
                                src={course.image}
                                alt={course.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="flex-1 p-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    {course.tags.map((tag) => (
                                      <Badge key={tag} variant="secondary" className="text-xs">
                                        {tag}
                                      </Badge>
                                    ))}
                                  </div>
                                  <h3 className="font-semibold text-gray-900 mb-1">{course.title}</h3>
                                  <p className="text-sm text-gray-500 mb-3">{course.description}</p>
                                  <div className="flex items-center gap-4 text-sm text-gray-500">
                                    <span className="flex items-center gap-1">
                                      <Users className="h-4 w-4" />
                                      {course.students.toLocaleString()}人学习
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Star className="h-4 w-4 text-yellow-400" />
                                      {course.rating}
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-4 w-4" />
                                      {course.duration}
                                    </span>
                                  </div>
                                </div>
                                <Button size="sm" className="shrink-0">
                                  {course.progress > 0 ? "继续学习" : "开始学习"}
                                  <ChevronRight className="h-4 w-4 ml-1" />
                                </Button>
                              </div>
                              {course.progress > 0 && (
                                <div className="mt-3">
                                  <div className="flex items-center justify-between text-sm mb-1">
                                    <span className="text-gray-500">学习进度</span>
                                    <span className="font-medium">{course.progress}%</span>
                                  </div>
                                  <Progress value={course.progress} className="h-2" />
                                </div>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="path" className="mt-0">
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{currentPath.title}</h3>
                        <p className="text-sm text-gray-500">系统化的能力提升路径</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-blue-600">{currentPath.totalProgress}%</p>
                        <p className="text-sm text-gray-500">总体进度</p>
                      </div>
                    </div>
                    <Progress value={currentPath.totalProgress} className="h-3" />
                    
                    <div className="relative">
                      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                      <div className="space-y-4">
                        {currentPath.stages.map((stage, index) => (
                          <div key={index} className="relative flex items-start gap-4 pl-10">
                            <div className={`absolute left-2 w-4 h-4 rounded-full border-2 ${
                              stage.completed
                                ? "bg-green-500 border-green-500"
                                : "bg-white border-gray-300"
                            }`}>
                              {stage.completed && <CheckCircle2 className="h-3 w-3 text-white" />}
                            </div>
                            <Card className={`flex-1 ${stage.completed ? "bg-green-50 border-green-200" : ""}`}>
                              <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="font-semibold">{stage.name}</h4>
                                  {stage.completed && (
                                    <Badge variant="secondary" className="bg-green-100 text-green-700">
                                      已完成
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-500">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    {stage.duration}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <BookOpen className="h-4 w-4" />
                                    {stage.courses}门课程
                                  </span>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>
        </div>

        {/* 底部：成就与激励 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-6">
              <Award className="h-8 w-8 mb-2 opacity-80" />
              <p className="text-3xl font-bold">12</p>
              <p className="text-sm opacity-80">已完成课程</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-6">
              <Clock className="h-8 w-8 mb-2 opacity-80" />
              <p className="text-3xl font-bold">48h</p>
              <p className="text-sm opacity-80">学习时长</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardContent className="p-6">
              <Star className="h-8 w-8 mb-2 opacity-80" />
              <p className="text-3xl font-bold">856</p>
              <p className="text-sm opacity-80">获得积分</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-6">
              <PlayCircle className="h-8 w-8 mb-2 opacity-80" />
              <p className="text-3xl font-bold">3</p>
              <p className="text-sm opacity-80">连续学习天数</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
