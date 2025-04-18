"use client";

import { useState } from "react";
import { useAuth } from "@/app/auth-provider";
import Link from "next/link";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

export function AuthTest() {
  const { customerId, customerName, setCustomerName } = useAuth();
  const [nameInput, setNameInput] = useState("");

  return (
    <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg space-y-4">
      <div>
        <h2 className="text-lg font-semibold mb-2">Test Customer</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 italic mb-4">
          To run integrations on behalf of a user your need a{" "}
          <Link href="https://console.integration.app/docs/getting-started/authentication">
            token
          </Link>
          , this customer id and name will be used to generate a token on the
          server. See{" "}
          <Link href="https://github.com/integration-app/documents-example/blob/6f0c8403e4e2f8b30901f23f6d3f781c4d6437f3/src/lib/integration-token.ts">
            code example{" "}
          </Link>
        </p>
        <p className="font-mono text-sm">
          Customer ID: {customerId || "Loading..."}
        </p>
        <p>Name: {customerName || "Not set"}</p>
      </div>

      <div className="flex gap-2">
        <Input
          type="text"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          placeholder="Enter customer name"
          className="max-w-xs"
        />
        <Button
          onClick={() => {
            if (nameInput.trim()) {
              setCustomerName(nameInput.trim());
              setNameInput("");
            }
          }}
        >
          Update Name
        </Button>
      </div>
    </div>
  );
}
