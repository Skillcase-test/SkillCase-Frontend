import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import UserPlanControl from "../dashboard-src/pages/app-analytics/UserPlanControl";

const learner = (extra = {}) => ({
  user_id: "u1",
  fullname: "Asha",
  is_paid: false,
  admin_plan: "free",
  current_profeciency_level: "B1",
  own_subscription: false,
  ...extra,
});

const openMenu = () => fireEvent.click(screen.getByRole("button", { name: /^Plan:/ }));
const optionNames = () => screen.getAllByRole("option").map((o) => o.textContent);
const pick = (name) => fireEvent.click(screen.getAllByRole("option").find((o) => o.textContent.startsWith(name)));

describe("UserPlanControl", () => {
  it("asks before changing, and only changes on Yes", () => {
    const onChange = vi.fn();
    render(<UserPlanControl user={learner()} canGrantPro={false} onChange={onChange} />);
    openMenu();
    pick("Career Plus");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(screen.getByText("Are you sure?")).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText("Cancel"));
    expect(screen.queryByText("Are you sure?")).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();

    openMenu();
    pick("Career Plus");
    fireEvent.click(screen.getByText("Yes, move to Career Plus"));
    expect(onChange).toHaveBeenCalledWith("plus");
  });

  it("asks on downgrades too", () => {
    const onChange = vi.fn();
    render(<UserPlanControl user={learner({ is_paid: true, admin_plan: "plus" })} canGrantPro={false} onChange={onChange} />);
    openMenu();
    pick("Free");
    fireEvent.click(screen.getByText("Yes, move to Free"));
    expect(onChange).toHaveBeenCalledWith("free");
  });

  it("picking the current plan does nothing", () => {
    const onChange = vi.fn();
    render(<UserPlanControl user={learner()} canGrantPro={false} onChange={onChange} />);
    openMenu();
    pick("Free");
    expect(screen.queryByText("Are you sure?")).not.toBeInTheDocument();
  });

  it("works from the keyboard", () => {
    const onChange = vi.fn();
    render(<UserPlanControl user={learner()} canGrantPro={false} onChange={onChange} />);
    const trigger = screen.getByRole("button", { name: /^Plan:/ });
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    fireEvent.keyDown(trigger, { key: "Enter" });
    fireEvent.click(screen.getByText("Yes, move to Career Plus"));
    expect(onChange).toHaveBeenCalledWith("plus");
  });

  it("hides Pro from admins who can't grant it", () => {
    render(<UserPlanControl user={learner()} canGrantPro={false} onChange={vi.fn()} />);
    openMenu();
    expect(optionNames().map((t) => t.split(/Full|No /)[0])).toEqual(["Free", "Career Plus"]);
  });

  it("shows Pro to the Pro admins, but not for A1", () => {
    const { unmount } = render(<UserPlanControl user={learner()} canGrantPro onChange={vi.fn()} />);
    openMenu();
    expect(screen.getAllByRole("option")).toHaveLength(3);
    unmount();

    render(<UserPlanControl user={learner({ current_profeciency_level: "A1" })} canGrantPro onChange={vi.fn()} />);
    openMenu();
    const pro = screen.getAllByRole("option")[2];
    expect(pro).toBeDisabled();
    expect(pro.textContent).toMatch(/Not available for A1/);
  });

  it("locks a Pro user for admins who can't change Pro", () => {
    render(<UserPlanControl user={learner({ is_paid: true, admin_plan: "pro" })} canGrantPro={false} onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /^Plan:/ })).toBeDisabled();
  });

  it("locks users on their own AutoPay", () => {
    render(<UserPlanControl user={learner({ own_subscription: true })} canGrantPro onChange={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /^Plan:/ })).not.toBeInTheDocument();
    expect(screen.getByText("AutoPay")).toBeInTheDocument();
  });
});
