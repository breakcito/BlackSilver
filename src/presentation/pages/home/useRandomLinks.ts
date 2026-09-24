import { useState, useEffect, useMemo } from "react";
import { CubeIcon } from "@heroicons/react/24/outline";
import { useMenuNav } from "../../../hooks/useMenuNav";
import { getIconoPorItem } from "../../../shared/variables/iconos-menu-navegacion";

export interface IAccesoRapido {
  title: string;
  desc: string;
  icon: React.ElementType;
  url: string;
}

export interface ILinkView extends IAccesoRapido {
  gradient: string;
  iconBg: string;
  border: string;
}

export const useRandomLinks = () => {
  const { menu } = useMenuNav();

  const allAccesses = useMemo(() => {
    if (!menu || !Array.isArray(menu)) return [];

    const accesses: IAccesoRapido[] = [];
    menu.forEach((menuItem) => {
      if (!Array.isArray(menuItem.submenus)) return;

      menuItem.submenus.forEach((submenu) => {
        if (!Array.isArray(submenu.modulos)) return;

        submenu.modulos.forEach((modulo) => {
          accesses.push({
            title: modulo.nombre,
            desc: submenu.nombre,
            icon: getIconoPorItem(modulo) || CubeIcon,
            url: `/${modulo.path}`,
          });
        });
      });
    });
    return accesses;
  }, [menu]);

  const [randomLinks, setRandomLinks] = useState<ILinkView[]>([]);

  useEffect(() => {
    // Solo generamos los links aleatorios si aún no tenemos ninguno, para evitar saltos
    // cuando el menu se actualiza en el layout en background
    if (randomLinks.length === 0 && allAccesses.length > 0) {
      const shuffled = [...allAccesses].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, 3);

      const availableGradients = [
        {
          gradient: "from-blue-500/20 to-cyan-500/20",
          iconBg: "from-blue-500 to-cyan-500",
          border: "group-hover:border-blue-500/50",
        },
        {
          gradient: "from-purple-500/20 to-pink-500/20",
          iconBg: "from-purple-500 to-pink-500",
          border: "group-hover:border-purple-500/50",
        },
        {
          gradient: "from-amber-500/20 to-orange-500/20",
          iconBg: "from-amber-500 to-orange-500",
          border: "group-hover:border-amber-500/50",
        },
        {
          gradient: "from-emerald-500/20 to-teal-500/20",
          iconBg: "from-emerald-500 to-teal-500",
          border: "group-hover:border-emerald-500/50",
        },
        {
          gradient: "from-rose-500/20 to-red-500/20",
          iconBg: "from-rose-500 to-red-500",
          border: "group-hover:border-rose-500/50",
        },
      ];

      const shuffledGradients = [...availableGradients].sort(
        () => 0.5 - Math.random(),
      );

      const withGradients = selected.map((item, index) => ({
        ...item,
        ...shuffledGradients[index % shuffledGradients.length],
      }));

      // eslint-disable-next-line
      setRandomLinks(withGradients);
    }
  }, [allAccesses, randomLinks.length]);

  return { randomLinks };
};
