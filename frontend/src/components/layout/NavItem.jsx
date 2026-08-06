import { NavLink } from "react-router-dom";

function NavItem({ to, icon: Icon, title }) {

    return (

        <NavLink
            to={to}
            className={({ isActive }) =>

                `group flex items-center gap-4 rounded-xl px-4 py-3 transition-all duration-300 font-medium

                ${
                    isActive
                        ? "bg-gradient-to-r from-violet-600 to-indigo-500 text-white shadow-lg"
                        : "text-slate-600 hover:bg-violet-50 hover:text-violet-700"
                }`

            }
        >

            <Icon
                size={20}
                className="shrink-0"
            />

            <span>
                {title}
            </span>

        </NavLink>

    );

}

export default NavItem;