"use client";

import { LoginForm } from "@/components/auth/login-form";
import { RegisterForm } from "@/components/auth/register-form";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function AuthTabs() {
  return (
    <Card>
      <Tabs defaultValue="login" className="w-full">
        <div className="px-6 pt-6">
          <TabsList className="w-full">
            <TabsTrigger value="login" className="flex-1">
              Connexion
            </TabsTrigger>
            <TabsTrigger value="register" className="flex-1">
              Inscription
            </TabsTrigger>
          </TabsList>
        </div>
        <CardContent>
          <TabsContent value="login">
            <LoginForm />
          </TabsContent>
          <TabsContent value="register">
            <RegisterForm />
          </TabsContent>
        </CardContent>
      </Tabs>
    </Card>
  );
}
