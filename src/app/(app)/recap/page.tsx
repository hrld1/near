import { redirect } from "next/navigation";

// "Vuestro mes" creció hasta convertirse en "Vuestro libro" (it28).
export default function RecapPage() {
  redirect("/libro");
}
