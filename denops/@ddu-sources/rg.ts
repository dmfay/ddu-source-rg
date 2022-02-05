import { BaseSource, Item } from "https://deno.land/x/ddu_vim@v0.4.0/types.ts";
import { Denops, fn } from "https://deno.land/x/ddu_vim@v0.4.0/deps.ts";
import { ActionData } from "https://deno.land/x/ddu_kind_file@v0.1.0/file.ts#^";

type Params = {
  args: string[];
  input: string;
};

export class Source extends BaseSource<Params> {
  kind = "file";

  gather(args: {
    denops: Denops;
    sourceParams: Params;
  }): ReadableStream<Item<ActionData>[]> {
    const findby = async (input: string) => {
      const cmd = ["rg", ...args.sourceParams.args, input];
      const cwd = await fn.getcwd(args.denops) as string;
      const p = Deno.run({
        cmd: cmd,
        stdout: "piped",
        stderr: "piped",
        stdin: "null",
        cwd: cwd,
      });

      const output = await p.output();
      const list = new TextDecoder().decode(output).split(/\r?\n/);
      const ret = list.filter((e) => e).map((e) => {
        const re = /^([^:]+):(\d+):(\d+):(.*)$/;
        const result = e.match(re);
        const get_param = (ary: string[], index: number) => {
          return ary[index] ? ary[index] : "";
        };

        const path = result ? get_param(result, 1) : "";
        const lineNr = result ? Number(get_param(result, 2)) : 0;
        const col = result ? Number(get_param(result, 3)) : 0;

        return {
          word: e,
          action: {
            path: path,
            lineNr: lineNr,
            col: col,
          },
        };
      });
      return ret;
    };

    return new ReadableStream({
      async start(controller) {
        controller.enqueue(
          await findby(args.sourceParams.input),
        );
        controller.close();
      },
    });
  }

  params(): Params {
    return {
      args: ["--column", "--no-heading", "--color", "never"],
      input: "",
    };
  }
}
