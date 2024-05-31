import React, { useEffect, useState, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/useAuth";
import { Badge } from "@/components/ui/badge";
import { toast } from "./ui/use-toast";
import { Loader2 } from "lucide-react";
import { User } from "firebase/auth";
import { useSuiClient } from "@/contexts/useSuiClient";
import { CoinBalance } from "@mysten/sui.js/client";

interface UserNavProps {
  user: User | null;
}

export const UserNav: React.FC<UserNavProps> = ({ user }) => {
  const navigate = useNavigate();
  const suiClient = useSuiClient();
  const { logout } = useAuth();
  const [balance, setBalance] = useState<CoinBalance | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [account] = useState(() =>
    JSON.parse(sessionStorage.getItem("zklogin-account") || "{}")
  );

  const getBalance = useCallback(async () => {
    try {
      const suiBalance = await suiClient.getBalance({
        owner: account.userAddr,
        coinType: "0x2::sui::SUI",
      });
      setBalance(suiBalance);
    } catch (error) {
      console.error("Error fetching SUI balance:", error);
    }
  }, [account.userAddr, suiClient]);

  useEffect(() => {
    getBalance();
  }, [getBalance]);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Failed to logout", error);
    }
  };

  const handleAirdrop = async () => {
    setSubmitting(true);
    try {
      await fetch("https://faucet.devnet.sui.io/v1/gas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          FixedAmountRequest: {
            recipient: account.userAddr,
          },
        }),
      });

      await getBalance();

      toast({
        title: "Success",
        description: "10 credits",
      });
    } catch (error) {
      console.error("Error getting credits", error);
      toast({
        title: "Error Getting Credits",
        description: "Try again later",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.photoURL || ""} alt="avatar" />
            <AvatarFallback>US</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-72" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none break-words">
              {user?.email || "User"}
            </p>
            <p className="text-xs leading-none text-muted-foreground break-words whitespace-normal">
              {account?.userAddr}
            </p>
            <p className="text-xs leading-none text-muted-foreground break-words whitespace-normal">
              {user?.displayName}
            </p>
          </div>
          <div className="flex items-center justify-between pt-2">
            <Badge>${(Number(balance?.totalBalance) / 1_000_000_000).toFixed(2)}</Badge>
            <Button
              variant="outline"
              className="ml-2 text-xs"
              onClick={handleAirdrop}
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Get More Credits"
              )}
            </Button>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleLogout}>Log out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
